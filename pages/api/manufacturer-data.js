// API: Manufacturer Portal Data
// Returns team + player + kit data for manufacturers - NO sensitive info
import pool from '../../lib/db';
import { getShirtDesigns } from '../../data/shirtDesigns';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all non-archived teams — only fields relevant to kit manufacturing
    const teamsResult = await pool.query(`
      SELECT
        t.id,
        t.team_name,
        t.team_logo,
        t.sponsor_logo,
        t.shirt_design,
        t.submission_data->>'kitDesignImageUrl' as kit_image_url,
        t.submission_data->>'kitDesignImage' as kit_image_fallback,
        t.submission_data->>'kitDesignId' as kit_design_id
      FROM teams t
      WHERE t.status NOT IN ('archived')
      ORDER BY t.team_name
    `);

    // Get all players — ONLY name, jersey size, jersey number (no email/phone/ID)
    const playersResult = await pool.query(`
      SELECT
        tp.team_id,
        tp.player_name,
        tp.jersey_size,
        tp.jersey_number
      FROM team_players tp
      JOIN teams t ON tp.team_id = t.id
      WHERE t.status NOT IN ('archived')
      ORDER BY tp.team_id, tp.player_name
    `);

    // Load shirt design catalog for fallback images
    let shirtDesignCatalog = [];
    try {
      shirtDesignCatalog = getShirtDesigns() || [];
    } catch (e) {
      console.error('Could not load shirt designs catalog:', e.message);
    }

    // Group players by team
    const playersByTeam = {};
    for (const p of playersResult.rows) {
      if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = [];
      playersByTeam[p.team_id].push({
        name: p.player_name,
        jerseySize: p.jersey_size || '',
        jerseyNumber: p.jersey_number
      });
    }

    // Build team objects
    const teams = teamsResult.rows.map(t => {
      const players = playersByTeam[t.id] || [];
      const kitDesignName = t.shirt_design || '';

      // Resolve kit design image: admin upload > fallback > catalog first image
      let kitDesignImage = t.kit_image_url || t.kit_image_fallback || '';
      if (!kitDesignImage && kitDesignName) {
        const catalogMatch = shirtDesignCatalog.find(
          d => d.name === kitDesignName || String(d.id) === String(t.kit_design_id)
        );
        if (catalogMatch && catalogMatch.images && catalogMatch.images.length > 0) {
          kitDesignImage = catalogMatch.images[0];
        }
      }

      // Build size summary
      const sizeSummary = {};
      for (const p of players) {
        const size = p.jerseySize || 'Not specified';
        sizeSummary[size] = (sizeSummary[size] || 0) + 1;
      }

      return {
        id: t.id,
        teamName: (t.team_name || '').trim(),
        teamLogo: t.team_logo || '',
        sponsorLogo: t.sponsor_logo || '',
        kitDesignName,
        kitDesignImage,
        playerCount: players.length,
        players,
        sizeSummary
      };
    });

    return res.status(200).json({
      teams,
      totalTeams: teams.length,
      totalPlayers: playersResult.rows.length
    });
  } catch (err) {
    console.error('Manufacturer data error:', err);
    return res.status(500).json({ error: 'Failed to load data' });
  }
}
