// Manufacturing Excel Export API
// GET: Download Excel spreadsheet of a batch or unbatched players for a team
import { query } from '../../lib/db';

// Dynamic import to avoid SSR issues
async function getExcelJS() {
  const ExcelJS = (await import('exceljs')).default;
  return ExcelJS;
}

function parseSize(selectedSize) {
  // Use " / Pants:" as the delimiter instead of "/" to avoid splitting youth sizes like "9/10 years"
  const shirtMatch = selectedSize?.match(/Shirt:\s*(.+?)\s*\/\s*Pants:/i)
    || selectedSize?.match(/Shirt:\s*(.+)/i);
  const pantsMatch = selectedSize?.match(/Pants:\s*(.+)/i);
  return {
    shirt: shirtMatch ? shirtMatch[1].trim() : '',
    pants: pantsMatch ? pantsMatch[1].trim() : ''
  };
}

// Normalize youth shirt/pants sizes: "9" → "9/10 years", "11" → "11/12 years", etc.
function normalizeYouthSize(size) {
  if (!size) return size;
  const youthSizeMap = {
    '7': '7/8 years', '8': '7/8 years', '7/8': '7/8 years',
    '9': '9/10 years', '10': '9/10 years', '9/10': '9/10 years',
    '11': '11/12 years', '12': '11/12 years', '11/12': '11/12 years',
    '13': '13/14 years', '14': '13/14 years', '13/14': '13/14 years'
  };
  const trimmed = size.trim();
  return youthSizeMap[trimmed] || trimmed;
}

function parsePlayerName(selectedSize) {
  const match = selectedSize?.match(/Player \d+ - (.+?)\s*\|/);
  return match ? match[1].trim() : '';
}

// Extract birth year from DOB string and format as player code
function formatPlayerCode(dob) {
  if (!dob || typeof dob !== 'string') return '';
  // Try to extract a 4-digit year from various date formats
  const yearMatch = dob.match(/(\d{4})/);
  if (yearMatch) return `WLQC-${yearMatch[1]}`;
  return '';
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
        SELECT mbp.*, tp.jersey_number,
               tp.registration_data->>'formSubmissionId' as fs_id
        FROM manufacturing_batch_players mbp
        LEFT JOIN team_players tp ON tp.id = mbp.team_player_id
        WHERE mbp.batch_id = $1
        ORDER BY mbp.sub_team, mbp.player_name
      `, [batchId]);

      // Look up DOB from form_submissions for each player
      for (const p of batchPlayers.rows) {
        let dob = '';
        if (p.fs_id) {
          const fsResult = await query(`SELECT data->>'10' as dob FROM form_submissions WHERE id = $1`, [p.fs_id]);
          dob = fsResult.rows[0]?.dob || '';
        }
        players.push({
          player_name: p.player_name,
          sub_team: p.sub_team || '',
          shirt_size: normalizeYouthSize(p.shirt_size || ''),
          pants_size: normalizeYouthSize(p.pants_size || ''),
          jersey_number: p.jersey_number || '',
          additional_items: p.additional_items || [],
          player_code: formatPlayerCode(dob)
        });
      }
    } else {
      // Export all unbatched paid players for a team
      const teamResult = await query('SELECT team_name FROM teams WHERE id = $1', [teamId]);
      if (!teamResult.rows[0]) return res.status(404).json({ error: 'Team not found' });
      teamName = teamResult.rows[0].team_name;
      fileName = `${teamName.replace(/[^a-zA-Z0-9]/g, '_')}_Unbatched_Players`;

      const unbatched = await query(`
        SELECT tp.id, tp.player_name, tp.player_email, tp.sub_team, tp.jersey_size, tp.jersey_number,
               tp.registration_data,
               fs.data->>'10' as dob
        FROM team_players tp
        LEFT JOIN manufacturing_batch_players mbp ON mbp.team_player_id = tp.id
        LEFT JOIN form_submissions fs ON fs.id::text = tp.registration_data->>'formSubmissionId'
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
          shirt_size: normalizeYouthSize(shirtSize || player.jersey_size || ''),
          pants_size: normalizeYouthSize(pantsSize || ''),
          jersey_number: player.jersey_number || '',
          additional_items: additionalItems,
          player_code: formatPlayerCode(player.dob || '')
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

    // Define columns (parent details removed, player code added)
    sheet.columns = [
      { header: '#', key: 'num', width: 5 },
      { header: 'Player Name', key: 'player_name', width: 28 },
      { header: 'Player Code', key: 'player_code', width: 16 },
      { header: 'Age Group / Sub-Team', key: 'sub_team', width: 35 },
      { header: 'Shirt Size', key: 'shirt_size', width: 15 },
      { header: 'Pants Size', key: 'pants_size', width: 15 },
      { header: 'Shirt Number', key: 'jersey_number', width: 14 },
      { header: 'Additional Items', key: 'additional', width: 50 }
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
      const additionalItems = player.additional_items || [];
      const additionalStr = additionalItems
        .map(item => `${item.name} (${item.size}) x${item.quantity}`)
        .join('\n');

      const row = sheet.addRow({
        num: idx + 1,
        player_name: player.player_name,
        player_code: player.player_code,
        sub_team: player.sub_team,
        shirt_size: player.shirt_size,
        pants_size: player.pants_size,
        jersey_number: player.jersey_number,
        additional: additionalStr
      });

      // Enable text wrapping on the additional items cell and auto-height for rows with multiple items
      const additionalCell = row.getCell('additional');
      additionalCell.alignment = { vertical: 'top', wrapText: true };
      if (additionalItems.length > 1) {
        row.height = Math.max(20, additionalItems.length * 15);
      }

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
      player_code: '',
      sub_team: `Team: ${teamName}`,
      shirt_size: '',
      pants_size: '',
      jersey_number: '',
      additional: `Generated: ${new Date().toLocaleDateString('en-ZA')}`
    });
    summaryRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10 };
    });

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: `H${players.length + 1}` };

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
