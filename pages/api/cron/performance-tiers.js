// Performance Tier Evaluation Cron — calculates supplier scores and auto-promotes/demotes tiers
import { query } from '../../../lib/db';

const CRON_SECRET = 'wlc-perf-2026';

// Tier thresholds — must meet ALL criteria to qualify
const TIER_THRESHOLDS = {
  platinum: { minScore: 90, minRating: 4.5, minCompliance: 97, minSales: 100 },
  gold:     { minScore: 75, minRating: 4.0, minCompliance: 92, minSales: 50 },
  silver:   { minScore: 55, minRating: 3.5, minCompliance: 85, minSales: 10 },
  bronze:   { minScore: 0,  minRating: 0,   minCompliance: 0,  minSales: 0 },
};

// Score weights (must sum to 1.0)
const WEIGHTS = {
  rating: 0.30,        // Customer reviews (0-5 → 0-100)
  slaCompliance: 0.35, // SLA compliance rate (0-100)
  salesVolume: 0.20,   // Total sales scaled (0-100)
  productQuality: 0.15 // Average product quality rating (1-5 → 0-100)
};

// Scale total_sales to 0-100 (100 sales = max score)
function scaleSales(totalSales) {
  return Math.min(100, (totalSales / 100) * 100);
}

function calculateScore(rating, slaCompliance, totalSales, avgProductQuality) {
  const ratingScore = (rating / 5) * 100;
  const qualityScore = (avgProductQuality / 5) * 100;
  const salesScore = scaleSales(totalSales);

  return (
    ratingScore * WEIGHTS.rating +
    slaCompliance * WEIGHTS.slaCompliance +
    salesScore * WEIGHTS.salesVolume +
    qualityScore * WEIGHTS.productQuality
  );
}

function determineTier(score, rating, slaCompliance, totalSales) {
  for (const tier of ['platinum', 'gold', 'silver']) {
    const t = TIER_THRESHOLDS[tier];
    if (score >= t.minScore && rating >= t.minRating && slaCompliance >= t.minCompliance && totalSales >= t.minSales) {
      return tier;
    }
  }
  return 'bronze';
}

export default async function handler(req, res) {
  if (req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Ensure performance_history table exists
    await query(`
      CREATE TABLE IF NOT EXISTS supplier_performance_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id UUID NOT NULL REFERENCES suppliers(id),
        old_tier VARCHAR(20),
        new_tier VARCHAR(20) NOT NULL,
        score DECIMAL(5, 2) NOT NULL,
        rating DECIMAL(3, 2),
        sla_compliance DECIMAL(5, 2),
        total_sales INTEGER,
        avg_product_quality DECIMAL(3, 2),
        reason VARCHAR(50) DEFAULT 'auto',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    let upgraded = 0;
    let downgraded = 0;
    let unchanged = 0;

    // ─── 1. Aggregate ratings from supplier_reviews → update suppliers.rating ───
    const reviewAgg = await query(`
      SELECT supplier_id, AVG(rating)::DECIMAL(3,2) AS avg_rating, COUNT(*)::int AS review_count
      FROM supplier_reviews
      GROUP BY supplier_id
    `);

    for (const row of reviewAgg.rows) {
      await query(
        'UPDATE suppliers SET rating = $1 WHERE id = $2',
        [row.avg_rating, row.supplier_id]
      );
    }

    // ─── 2. Get all active approved suppliers with their metrics ─────
    const suppliers = await query(`
      SELECT s.id, s.company_name, s.performance_tier, s.rating, s.total_sales,
             s.sla_compliance_rate, s.total_revenue
      FROM suppliers s
      WHERE s.status = 'approved' AND s.active = true
    `);

    for (const sup of suppliers.rows) {
      // Get average product quality rating for this supplier
      const qualityResult = await query(`
        SELECT COALESCE(AVG(quality_rating), 0)::DECIMAL(3,2) AS avg_quality
        FROM products
        WHERE supplier_id = $1 AND approval_status = 'approved' AND quality_rating IS NOT NULL
      `, [sup.id]);

      const rating = parseFloat(sup.rating || 0);
      const slaCompliance = parseFloat(sup.sla_compliance_rate || 100);
      const totalSales = parseInt(sup.total_sales || 0);
      const avgProductQuality = parseFloat(qualityResult.rows[0].avg_quality || 0);
      const oldTier = sup.performance_tier || 'bronze';

      const score = calculateScore(rating, slaCompliance, totalSales, avgProductQuality);
      const newTier = determineTier(score, rating, slaCompliance, totalSales);

      // Update supplier's performance tier
      await query(
        'UPDATE suppliers SET performance_tier = $1, updated_at = NOW() WHERE id = $2',
        [newTier, sup.id]
      );

      // Record history if tier changed
      if (newTier !== oldTier) {
        await query(`
          INSERT INTO supplier_performance_history 
            (supplier_id, old_tier, new_tier, score, rating, sla_compliance, total_sales, avg_product_quality, reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'auto')
        `, [sup.id, oldTier, newTier, score.toFixed(2), rating, slaCompliance, totalSales, avgProductQuality]);

        if (['silver', 'gold', 'platinum'].indexOf(newTier) > ['silver', 'gold', 'platinum'].indexOf(oldTier)) {
          upgraded++;
          console.log(`[PERF] ${sup.company_name}: ${oldTier} → ${newTier} (score: ${score.toFixed(1)})`);
        } else {
          downgraded++;
          console.log(`[PERF] ${sup.company_name}: ${oldTier} → ${newTier} (score: ${score.toFixed(1)})`);
        }
      } else {
        unchanged++;
      }
    }

    // ─── 3. Auto-feature gold/platinum suppliers ─────────────────────
    await query(`UPDATE suppliers SET featured = true WHERE performance_tier IN ('gold', 'platinum') AND active = true`);
    await query(`UPDATE suppliers SET featured = false WHERE performance_tier IN ('bronze', 'silver') AND featured = true`);

    console.log(`[PERF] Evaluation complete — Upgraded: ${upgraded}, Downgraded: ${downgraded}, Unchanged: ${unchanged}`);
    return res.json({
      success: true,
      evaluated: suppliers.rows.length,
      upgraded,
      downgraded,
      unchanged,
      evaluatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[PERF] Evaluation error:', err.message);
    return res.status(500).json({ success: false, error: 'Performance evaluation failed' });
  }
}
