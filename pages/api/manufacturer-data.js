// API: Manufacturer Portal Data
// Returns team + player + kit data for manufacturers — NO sensitive info
// Only PAID players are included. Pants sizes are resolved from form submissions.
import pool from '../../lib/db';
import { getShirtDesigns } from '../../data/shirtDesigns';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── TEAMS ──────────────────────────────────────────────
    const teamsResult = await pool.query(`
      SELECT
        t.id,
        t.team_name,
        t.team_logo,
        t.sponsor_logo,
        t.submission_data->'sponsorLogos' as sponsor_logos_json,
        t.shirt_design,
        t.submission_data->>'kitDesignImageUrl' as kit_image_url,
        t.submission_data->>'kitDesignImage' as kit_image_fallback,
        t.submission_data->>'kitDesignId' as kit_design_id
      FROM teams t
      WHERE t.status NOT IN ('archived')
      ORDER BY t.team_name
    `);

    // ── PAID PLAYERS ONLY — with pants size from form submissions ──
    const playersResult = await pool.query(`
      SELECT
        tp.team_id,
        tp.player_name,
        tp.jersey_size,
        tp.jersey_number,
        tp.registration_data->>'formSubmissionId' as fs_id,
        fs.data->>'25_pantsSize' as pants_size,
        fs.data->>'10' as date_of_birth
      FROM team_players tp
      JOIN teams t ON tp.team_id = t.id
      LEFT JOIN form_submissions fs
        ON fs.id::text = tp.registration_data->>'formSubmissionId'
      WHERE t.status NOT IN ('archived')
        AND tp.payment_status = 'paid'
      ORDER BY tp.team_id, tp.player_name
    `);

    // ── ADDITIONAL ITEMS from paid registration + additional-apparel orders ──
    // Link orders to specific players via parent-email → team_players
    // Excludes items pending payment (_pendingPayment flag from addon merges)
    const additionalItemsResult = await pool.query(`
      SELECT
        tp.team_id,
        tp.player_name,
        o.customer_name as ordered_by,
        item.value->>'id' as item_id,
        item.value->>'name' as item_name,
        item.value->>'selectedSize' as item_size,
        (item.value->>'quantity')::int as item_qty,
        item.value->>'image' as item_image
      FROM orders o
      JOIN team_players tp
        ON (tp.registration_data->>'parentEmail' = o.customer_email
            OR tp.player_email = o.customer_email)
      JOIN teams t ON t.id = tp.team_id
      CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS item(value, item_idx)
      WHERE o.payment_status = 'paid'
        AND o.order_type IN ('registration', 'additional-apparel')
        AND t.status NOT IN ('archived')
        AND tp.payment_status = 'paid'
        AND COALESCE(item.value->>'_pendingPayment', 'false') != 'true'
        AND item.value->>'id' != 'basic-kit'
      ORDER BY tp.team_id, tp.player_name, item.value->>'name'
    `);

    // ── ADDITIONAL APPAREL REVENUE (cost-based) ──
    // Query all non-basic-kit items from paid orders, join with products table for cost prices
    // Includes both player registration items and supporter items
    const apparelRevenueResult = await pool.query(`
      SELECT
        item.value->>'id' as item_id,
        item.value->>'name' as item_name,
        (item.value->>'price')::numeric as sale_price,
        SUM((item.value->>'quantity')::int) as total_qty,
        COALESCE(p.cost, 0) as unit_cost
      FROM orders o
      CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item(value)
      LEFT JOIN products p ON p.id::text = item.value->>'id'
        OR (item.value->>'id' LIKE 'supporter_%' AND p.id::text = REPLACE(item.value->>'id', 'supporter_', ''))
      WHERE o.payment_status = 'paid'
        AND item.value->>'id' != 'basic-kit'
      GROUP BY item.value->>'id', item.value->>'name', item.value->>'price', p.cost
      ORDER BY item.value->>'name'
    `);

    // Build apparel revenue breakdown
    let totalApparelRevenue = 0;
    const apparelItems = apparelRevenueResult.rows.map(r => {
      const qty = parseInt(r.total_qty) || 0;
      const unitCost = parseFloat(r.unit_cost) || 0;
      const lineTotal = qty * unitCost;
      totalApparelRevenue += lineTotal;
      return {
        itemId: r.item_id,
        itemName: r.item_name,
        salePrice: parseFloat(r.sale_price) || 0,
        unitCost,
        qtySold: qty,
        totalCostRevenue: lineTotal
      };
    });

    // ── Shirt design catalog for fallback images ──
    let shirtDesignCatalog = [];
    try {
      shirtDesignCatalog = getShirtDesigns() || [];
    } catch (e) {
      console.error('Could not load shirt designs catalog:', e.message);
    }

    // ── Group players by team ──
    const playersByTeam = {};
    for (const p of playersResult.rows) {
      if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = [];
      playersByTeam[p.team_id].push({
        name: p.player_name,
        shirtSize: p.jersey_size || '',
        pantsSize: p.pants_size || '',
        shirtNumber: p.jersey_number,
        dateOfBirth: p.date_of_birth || '',
        additionalItems: []  // will be populated below
      });
    }

    // ── Link additional items to their specific players ──
    for (const item of additionalItemsResult.rows) {
      const teamPlayers = playersByTeam[item.team_id] || [];
      const player = teamPlayers.find(p => p.name === item.player_name);
      const isSupporter = (item.item_id || '').startsWith('supporter_') || (item.item_name || '').toLowerCase().includes('supporter');
      const itemObj = {
        id: item.item_id || '',
        name: item.item_name || '',
        size: item.item_size || null,
        quantity: item.item_qty || 1,
        image: item.item_image || '',
        orderedBy: item.ordered_by || '',
        isSupporter
      };
      if (player) {
        player.additionalItems.push(itemObj);
      }
    }

    // ── Build team objects ──
    let totalPaidPlayers = 0;
    const teams = teamsResult.rows.map(t => {
      const players = playersByTeam[t.id] || [];
      const kitDesignName = t.shirt_design || '';
      totalPaidPlayers += players.length;

      // Resolve kit image: admin upload > fallback > catalog first image
      let kitDesignImage = t.kit_image_url || t.kit_image_fallback || '';
      if (!kitDesignImage && kitDesignName) {
        const catalogMatch = shirtDesignCatalog.find(
          d => d.name === kitDesignName || String(d.id) === String(t.kit_design_id)
        );
        if (catalogMatch && catalogMatch.images && catalogMatch.images.length > 0) {
          kitDesignImage = catalogMatch.images[0];
        }
      }

      // Build shirt size summary
      const shirtSizeSummary = {};
      const pantsSizeSummary = {};
      for (const p of players) {
        const ss = p.shirtSize || 'Not specified';
        shirtSizeSummary[ss] = (shirtSizeSummary[ss] || 0) + 1;
        const ps = p.pantsSize || 'Not specified';
        pantsSizeSummary[ps] = (pantsSizeSummary[ps] || 0) + 1;
      }

      // Collect all additional items across all players (for team-level summary)
      const allAdditionalItems = [];
      for (const p of players) {
        for (const ai of p.additionalItems) {
          allAdditionalItems.push(ai);
        }
      }

      // Aggregate additional items for team summary
      const additionalSummary = {};
      for (const ai of allAdditionalItems) {
        const key = `${ai.name}||${ai.size || 'One Size'}`;
        if (!additionalSummary[key]) {
          additionalSummary[key] = { name: ai.name, size: ai.size || 'One Size', quantity: 0, image: ai.image, isSupporter: ai.isSupporter };
        }
        additionalSummary[key].quantity += ai.quantity;
      }

      return {
        id: t.id,
        teamName: (t.team_name || '').trim(),
        teamLogo: t.team_logo || '',
        sponsorLogo: t.sponsor_logo || '',
        sponsorLogos: (() => {
          // Support new multi-logo array from submission_data, fall back to single sponsor_logo
          try {
            const arr = typeof t.sponsor_logos_json === 'string' ? JSON.parse(t.sponsor_logos_json) : t.sponsor_logos_json;
            if (Array.isArray(arr) && arr.length > 0) return arr;
          } catch (e) { /* ignore */ }
          return t.sponsor_logo ? [t.sponsor_logo] : [];
        })(),
        kitDesignName,
        kitDesignImage,
        playerCount: players.length,
        players,
        shirtSizeSummary,
        pantsSizeSummary,
        additionalItems: Object.values(additionalSummary),
        totalAdditionalQty: allAdditionalItems.reduce((s, i) => s + i.quantity, 0)
      };
    });

    return res.status(200).json({
      teams,
      totalTeams: teams.length,
      totalPlayers: totalPaidPlayers,
      apparelRevenue: {
        total: totalApparelRevenue,
        items: apparelItems
      }
    });
  } catch (err) {
    console.error('Manufacturer data error:', err);
    return res.status(500).json({ error: 'Failed to load data' });
  }
}
