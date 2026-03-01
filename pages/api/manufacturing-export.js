// Manufacturing Excel Export API
// GET: Download Excel spreadsheet of a batch or unbatched players for a team
import { query } from '../../lib/db';

// Dynamic import to avoid SSR issues
async function getExcelJS() {
  const ExcelJS = (await import('exceljs')).default;
  return ExcelJS;
}

function parseSize(selectedSize) {
  const shirtMatch = selectedSize?.match(/Shirt:\s*([^/]+)/i);
  const pantsMatch = selectedSize?.match(/Pants:\s*(.+)/i);
  return {
    shirt: shirtMatch ? shirtMatch[1].trim() : '',
    pants: pantsMatch ? pantsMatch[1].trim() : ''
  };
}

function parsePlayerName(selectedSize) {
  const match = selectedSize?.match(/Player \d+ - (.+?)\s*\|/);
  return match ? match[1].trim() : '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId, batchId } = req.query;
    if (!teamId && !batchId) {
      return res.status(400).json({ error: 'teamId or batchId required' });
    }

    let players = [];
    let teamName = '';
    let fileName = '';

    if (batchId) {
      // Export a specific batch
      const batch = await query(`
        SELECT mb.*, t.team_name
        FROM manufacturing_batches mb
        JOIN teams t ON t.id = mb.team_id
        WHERE mb.id = $1
      `, [batchId]);
      if (!batch.rows[0]) return res.status(404).json({ error: 'Batch not found' });

      teamName = batch.rows[0].team_name;
      fileName = `${teamName.replace(/[^a-zA-Z0-9]/g, '_')}_Batch_${batch.rows[0].batch_number}`;

      const batchPlayers = await query(`
        SELECT mbp.*, tp.jersey_number
        FROM manufacturing_batch_players mbp
        LEFT JOIN team_players tp ON tp.id = mbp.team_player_id
        WHERE mbp.batch_id = $1
        ORDER BY mbp.sub_team, mbp.player_name
      `, [batchId]);

      players = batchPlayers.rows.map(p => ({
        player_name: p.player_name,
        sub_team: p.sub_team || '',
        shirt_size: p.shirt_size || '',
        pants_size: p.pants_size || '',
        jersey_number: p.jersey_number || '',
        additional_items: p.additional_items || [],
        parent_name: p.parent_name || '',
        parent_email: p.parent_email || '',
        parent_phone: p.parent_phone || ''
      }));
    } else {
      // Export all unbatched paid players for a team
      const teamResult = await query('SELECT team_name FROM teams WHERE id = $1', [teamId]);
      if (!teamResult.rows[0]) return res.status(404).json({ error: 'Team not found' });
      teamName = teamResult.rows[0].team_name;
      fileName = `${teamName.replace(/[^a-zA-Z0-9]/g, '_')}_Unbatched_Players`;

      const unbatched = await query(`
        SELECT tp.id, tp.player_name, tp.player_email, tp.sub_team, tp.jersey_size, tp.jersey_number,
               tp.registration_data
        FROM team_players tp
        LEFT JOIN manufacturing_batch_players mbp ON mbp.team_player_id = tp.id
        WHERE tp.team_id = $1 AND tp.payment_status = 'paid' AND mbp.id IS NULL
        ORDER BY tp.sub_team, tp.player_name
      `, [teamId]);

      for (const player of unbatched.rows) {
        const parentEmail = player.registration_data?.parentEmail || player.player_email;
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

        players.push({
          player_name: player.player_name,
          sub_team: player.sub_team || '',
          shirt_size: shirtSize || player.jersey_size || '',
          pants_size: pantsSize || '',
          jersey_number: player.jersey_number || '',
          additional_items: additionalItems,
          parent_name: order?.customer_name || '',
          parent_email: parentEmail,
          parent_phone: order?.customer_phone || ''
        });
      }
    }

    // Generate Excel
    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Winter League Cricket';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(teamName.substring(0, 31)); // Excel max 31 chars

    // Header styling
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const headerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Define columns 
    sheet.columns = [
      { header: '#', key: 'num', width: 5 },
      { header: 'Player Name', key: 'player_name', width: 28 },
      { header: 'Age Group / Sub-Team', key: 'sub_team', width: 35 },
      { header: 'Shirt Size', key: 'shirt_size', width: 15 },
      { header: 'Pants Size', key: 'pants_size', width: 15 },
      { header: 'Shirt Number', key: 'jersey_number', width: 14 },
      { header: 'Additional Items', key: 'additional', width: 35 },
      { header: 'Parent Name', key: 'parent_name', width: 22 },
      { header: 'Parent Email', key: 'parent_email', width: 30 },
      { header: 'Parent Phone', key: 'parent_phone', width: 18 }
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = headerAlignment;
    });
    headerRow.height = 25;

    // Add data rows
    players.forEach((player, idx) => {
      const additionalStr = (player.additional_items || [])
        .map(item => `${item.name} (${item.size}) x${item.quantity}`)
        .join(', ');

      const row = sheet.addRow({
        num: idx + 1,
        player_name: player.player_name,
        sub_team: player.sub_team,
        shirt_size: player.shirt_size,
        pants_size: player.pants_size,
        jersey_number: player.jersey_number,
        additional: additionalStr,
        parent_name: player.parent_name,
        parent_email: player.parent_email,
        parent_phone: player.parent_phone
      });

      // Alternate row colors
      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        });
      }
    });

    // Summary row
    sheet.addRow([]); // blank
    const summaryRow = sheet.addRow({
      num: '',
      player_name: `Total Players: ${players.length}`,
      sub_team: `Team: ${teamName}`,
      shirt_size: '',
      pants_size: '',
      jersey_number: '',
      additional: `Generated: ${new Date().toLocaleDateString('en-ZA')}`,
      parent_name: '',
      parent_email: '',
      parent_phone: ''
    });
    summaryRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10 };
    });

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: `J${players.length + 1}` };

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
    res.setHeader('Content-Length', buffer.byteLength);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Manufacturing export error:', error);
    return res.status(500).json({ error: 'Export failed', details: error.message });
  }
}
