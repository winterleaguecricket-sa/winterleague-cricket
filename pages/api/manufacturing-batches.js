// Manufacturing Batches API
// GET:  List batches, unbatched players, team summary
// POST: Create batch, mark as submitted/paid
import { query } from '../../lib/db';

// Manufacturer cost per basic kit
const MANUFACTURER_KIT_COST = 433.50;

function parseSize(selectedSize) {
  // "Player 1 - Name | Shirt: Medium / Pants: Medium"
  const shirtMatch = selectedSize?.match(/Shirt:\s*([^/]+)/i);
  const pantsMatch = selectedSize?.match(/Pants:\s*(.+)/i);
  return {
    shirt: shirtMatch ? shirtMatch[1].trim() : '',
    pants: pantsMatch ? pantsMatch[1].trim() : ''
  };
}

function parsePlayerName(selectedSize) {
  // "Player 1 - Name | Shirt: ..."
  const match = selectedSize?.match(/Player \d+ - (.+?)\s*\|/);
  return match ? match[1].trim() : '';
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { action, teamId, batchId } = req.query;

      // Get teams summary with batch info
      if (action === 'teams-summary') {
        const result = await query(`
          SELECT t.id, t.team_name,
            COUNT(DISTINCT tp.id) FILTER (WHERE tp.payment_status = 'paid') as total_paid_players,
            COUNT(DISTINCT mbp.team_player_id) as batched_players,
            COUNT(DISTINCT tp.id) FILTER (WHERE tp.payment_status = 'paid') - COUNT(DISTINCT mbp.team_player_id) as unbatched_players,
            COUNT(DISTINCT mb.id) as total_batches,
            MAX(mb.created_at) as last_batch_date
          FROM teams t
          JOIN team_players tp ON tp.team_id = t.id AND tp.payment_status = 'paid'
          LEFT JOIN manufacturing_batch_players mbp ON mbp.team_player_id = tp.id
          LEFT JOIN manufacturing_batches mb ON mb.team_id = t.id
          GROUP BY t.id, t.team_name
          ORDER BY t.team_name
        `);
        return res.status(200).json({ teams: result.rows });
      }

      // Get batches for a team
      if (action === 'team-batches' && teamId) {
        const batches = await query(`
          SELECT mb.*, t.team_name,
            (SELECT COUNT(*) FROM manufacturing_batch_players WHERE batch_id = mb.id) as player_count,
            COALESCE(mb.total_cost, 0) as total_cost
          FROM manufacturing_batches mb
          JOIN teams t ON t.id = mb.team_id
          WHERE mb.team_id = $1
          ORDER BY mb.batch_number DESC
        `, [teamId]);
        return res.status(200).json({ batches: batches.rows });
      }

      // Get batch details with players
      if (action === 'batch-details' && batchId) {
        const batch = await query(`
          SELECT mb.*, t.team_name
          FROM manufacturing_batches mb
          JOIN teams t ON t.id = mb.team_id
          WHERE mb.id = $1
        `, [batchId]);
        if (!batch.rows[0]) return res.status(404).json({ error: 'Batch not found' });

        const players = await query(`
          SELECT mbp.*, tp.jersey_number as shirt_number
          FROM manufacturing_batch_players mbp
          LEFT JOIN team_players tp ON tp.id = mbp.team_player_id
          WHERE mbp.batch_id = $1
          ORDER BY mbp.sub_team, mbp.player_name
        `, [batchId]);

        // Calculate total cost if not stored yet
        let batchData = batch.rows[0];
        if (!batchData.total_cost || parseFloat(batchData.total_cost) === 0) {
          let calculatedCost = 0;
          for (const p of players.rows) {
            calculatedCost += MANUFACTURER_KIT_COST;
            const items = typeof p.additional_items === 'string' ? JSON.parse(p.additional_items) : (p.additional_items || []);
            for (const item of items) {
              if (item.cost) {
                calculatedCost += parseFloat(item.cost) * (item.quantity || 1);
              }
            }
          }
          batchData = { ...batchData, total_cost: calculatedCost };
        }

        return res.status(200).json({
          batch: batchData,
          players: players.rows
        });
      }

      // Get unbatched players for a team (paid but not in any batch)
      if (action === 'unbatched-players' && teamId) {
        const players = await query(`
          SELECT tp.id, tp.player_name, tp.player_email, tp.sub_team, tp.jersey_size, tp.jersey_number,
                 tp.registration_data, tp.team_id, t.team_name
          FROM team_players tp
          JOIN teams t ON t.id = tp.team_id
          LEFT JOIN manufacturing_batch_players mbp ON mbp.team_player_id = tp.id
          WHERE tp.team_id = $1 AND tp.payment_status = 'paid' AND mbp.id IS NULL
          ORDER BY tp.sub_team, tp.player_name
        `, [teamId]);

        // Enrich with order data (sizes, additional items)
        const enriched = [];
        for (const player of players.rows) {
          const parentEmail = player.registration_data?.parentEmail || player.player_email;
          
          // Find matching order
          const orderResult = await query(`
            SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.items, o.total_amount
            FROM orders o
            WHERE LOWER(o.customer_email) = LOWER($1) AND o.payment_status = 'paid'
            ORDER BY o.created_at DESC
            LIMIT 1
          `, [parentEmail]);

          const order = orderResult.rows[0];
          let shirtSize = '', pantsSize = '', additionalItems = [];

          if (order?.items) {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            for (const item of items) {
              if (item.id === 'basic-kit') {
                // Extract sizes from selectedSize
                const playerNameInItem = parsePlayerName(item.selectedSize);
                // Match player name - could be multiple players in same order
                if (playerNameInItem.toLowerCase().includes(player.player_name.split(' ')[0].toLowerCase())) {
                  const sizes = parseSize(item.selectedSize);
                  shirtSize = sizes.shirt;
                  pantsSize = sizes.pants;
                }
              } else {
                // Additional apparel item
                additionalItems.push({
                  name: item.name,
                  size: item.selectedSize,
                  quantity: item.quantity,
                  price: item.price
                });
              }
            }
            // Fallback: if no match found, use first basic-kit
            if (!shirtSize) {
              const basicKit = items.find(i => i.id === 'basic-kit');
              if (basicKit) {
                const sizes = parseSize(basicKit.selectedSize);
                shirtSize = sizes.shirt;
                pantsSize = sizes.pants;
              }
            }
          }

          enriched.push({
            ...player,
            order_id: order?.id || null,
            order_number: order?.order_number || null,
            parent_name: order?.customer_name || '',
            parent_phone: order?.customer_phone || '',
            parent_email: parentEmail,
            shirt_size: shirtSize || player.jersey_size || '',
            pants_size: pantsSize || '',
            shirt_number: player.jersey_number || '',
            additional_items: additionalItems
          });
        }

        return res.status(200).json({ players: enriched });
      }

      // Get paid batches for a team (for team portal notifications)
      if (action === 'team-paid-batches' && teamId) {
        const batches = await query(`
          SELECT mb.id, mb.batch_number, mb.status, mb.total_players, mb.paid_at, t.team_name
          FROM manufacturing_batches mb
          JOIN teams t ON t.id = mb.team_id
          WHERE mb.team_id = $1 AND mb.status = 'paid'
          ORDER BY mb.paid_at DESC
        `, [teamId]);

        // For each batch, get the players
        const batchesWithPlayers = [];
        for (const batch of batches.rows) {
          const players = await query(`
            SELECT mbp.player_name, mbp.sub_team, mbp.shirt_size, mbp.pants_size,
                   tp.jersey_number as shirt_number
            FROM manufacturing_batch_players mbp
            LEFT JOIN team_players tp ON tp.id = mbp.team_player_id
            WHERE mbp.batch_id = $1
            ORDER BY mbp.sub_team, mbp.player_name
          `, [batch.id]);
          batchesWithPlayers.push({ ...batch, players: players.rows });
        }

        return res.status(200).json({ batches: batchesWithPlayers });
      }

      return res.status(400).json({ error: 'Missing action parameter' });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      // Create a new batch from unbatched players
      if (action === 'create-batch') {
        const { teamId, playerIds, notes } = req.body;
        if (!teamId || !playerIds?.length) {
          return res.status(400).json({ error: 'teamId and playerIds required' });
        }

        // Get next batch number for this team
        const batchNumResult = await query(
          'SELECT COALESCE(MAX(batch_number), 0) + 1 as next_num FROM manufacturing_batches WHERE team_id = $1',
          [teamId]
        );
        const batchNumber = batchNumResult.rows[0].next_num;

        // Create batch
        const batchResult = await query(`
          INSERT INTO manufacturing_batches (team_id, batch_number, status, notes, total_players)
          VALUES ($1, $2, 'created', $3, $4)
          RETURNING *
        `, [teamId, batchNumber, notes || null, playerIds.length]);
        const batch = batchResult.rows[0];

        let batchTotalCost = 0;

        // Get player details with order data to snapshot
        for (const playerId of playerIds) {
          const playerResult = await query(`
            SELECT tp.id, tp.player_name, tp.player_email, tp.sub_team, tp.jersey_size,
                   tp.registration_data
            FROM team_players tp
            WHERE tp.id = $1 AND tp.payment_status = 'paid'
          `, [playerId]);
          const player = playerResult.rows[0];
          if (!player) continue;

          const parentEmail = player.registration_data?.parentEmail || player.player_email;

          // Find matching order
          const orderResult = await query(`
            SELECT o.id, o.customer_name, o.customer_phone, o.items
            FROM orders o
            WHERE LOWER(o.customer_email) = LOWER($1) AND o.payment_status = 'paid'
            ORDER BY o.created_at DESC LIMIT 1
          `, [parentEmail]);
          const order = orderResult.rows[0];
          let shirtSize = '', pantsSize = '', additionalItems = [];

          if (order?.items) {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            for (const item of items) {
              if (item.id === 'basic-kit') {
                const playerNameInItem = parsePlayerName(item.selectedSize);
                if (playerNameInItem.toLowerCase().includes(player.player_name.split(' ')[0].toLowerCase())) {
                  const sizes = parseSize(item.selectedSize);
                  shirtSize = sizes.shirt;
                  pantsSize = sizes.pants;
                }
              } else {
                additionalItems.push({
                  name: item.name,
                  size: item.selectedSize,
                  quantity: item.quantity,
                  price: item.price
                });
              }
            }
            if (!shirtSize) {
              const basicKit = items.find(i => i.id === 'basic-kit');
              if (basicKit) {
                const sizes = parseSize(basicKit.selectedSize);
                shirtSize = sizes.shirt;
                pantsSize = sizes.pants;
              }
            }
          }

          // Look up cost prices for additional items from products table
          const additionalItemsWithCost = [];
          let playerAdditionalCost = 0;
          for (const item of additionalItems) {
            let costPrice = 0;
            const itemId = String(item.id || '').replace('supporter_', '');
            if (itemId) {
              const costResult = await query('SELECT cost FROM products WHERE id = $1', [parseInt(itemId)]);
              if (costResult.rows[0]?.cost) {
                costPrice = parseFloat(costResult.rows[0].cost);
              }
            }
            playerAdditionalCost += costPrice * (item.quantity || 1);
            additionalItemsWithCost.push({ ...item, cost: costPrice });
          }

          await query(`
            INSERT INTO manufacturing_batch_players 
              (batch_id, team_player_id, order_id, player_name, sub_team, shirt_size, pants_size, additional_items, parent_name, parent_email, parent_phone, kit_cost, additional_cost)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (team_player_id) DO NOTHING
          `, [
            batch.id, player.id, order?.id || null,
            player.player_name, player.sub_team,
            shirtSize || player.jersey_size || '', pantsSize,
            JSON.stringify(additionalItemsWithCost),
            order?.customer_name || '', parentEmail, order?.customer_phone || '',
            MANUFACTURER_KIT_COST, playerAdditionalCost
          ]);
          batchTotalCost += MANUFACTURER_KIT_COST + playerAdditionalCost;
        }

        // Update batch with total cost
        await query('UPDATE manufacturing_batches SET total_cost = $1 WHERE id = $2', [batchTotalCost, batch.id]);

        return res.status(200).json({ batch: { ...batch, total_cost: batchTotalCost }, message: `Batch #${batchNumber} created with ${playerIds.length} players. Manufacturer cost: R${batchTotalCost.toFixed(2)}` });
      }

      // Mark batch as submitted to manufacturer
      if (action === 'mark-submitted') {
        const { batchId } = req.body;
        const result = await query(`
          UPDATE manufacturing_batches 
          SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'created'
          RETURNING *
        `, [batchId]);
        if (!result.rows[0]) return res.status(404).json({ error: 'Batch not found or already submitted' });
        return res.status(200).json({ batch: result.rows[0] });
      }

      // Mark batch as paid → update all parent orders to in_production
      if (action === 'mark-paid') {
        const { batchId } = req.body;
        
        // Update batch status
        const batchResult = await query(`
          UPDATE manufacturing_batches 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status IN ('created', 'submitted')
          RETURNING *
        `, [batchId]);
        if (!batchResult.rows[0]) return res.status(404).json({ error: 'Batch not found or already paid' });
        const batch = batchResult.rows[0];

        // Get all order IDs from this batch
        const batchPlayers = await query(`
          SELECT DISTINCT order_id FROM manufacturing_batch_players 
          WHERE batch_id = $1 AND order_id IS NOT NULL
        `, [batchId]);

        let updatedOrders = 0;
        for (const row of batchPlayers.rows) {
          // Update order status to in_production
          const orderResult = await query(`
            UPDATE orders SET 
              status = 'in_production',
              status_history = COALESCE(status_history, '[]'::jsonb) || $1::jsonb,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'confirmed'
            RETURNING id
          `, [
            JSON.stringify([{
              status: 'in_production',
              timestamp: new Date().toISOString(),
              note: `Manufacturing batch #${batch.batch_number} marked as paid - kit sent for production`
            }]),
            row.order_id
          ]);
          if (orderResult.rows[0]) updatedOrders++;
        }

        return res.status(200).json({
          batch: batchResult.rows[0],
          updatedOrders,
          message: `Batch #${batch.batch_number} marked as paid. ${updatedOrders} parent orders updated to "In Production".`
        });
      }

      // Delete a batch (only if status is 'created')
      if (action === 'delete-batch') {
        const { batchId } = req.body;
        const result = await query(`
          DELETE FROM manufacturing_batches WHERE id = $1 AND status = 'created'
          RETURNING *
        `, [batchId]);
        if (!result.rows[0]) return res.status(404).json({ error: 'Batch not found or already submitted/paid' });
        return res.status(200).json({ message: 'Batch deleted' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Manufacturing batches API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
