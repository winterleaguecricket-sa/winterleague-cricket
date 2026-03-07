import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await query(
      `SELECT order_number, customer_name, total_amount, items, payment_status, created_at
       FROM orders
       WHERE LOWER(customer_email) = LOWER($1)
         AND order_type = 'shortfall'
         AND payment_status = 'pending'
       ORDER BY created_at`,
      [email]
    );

    return res.status(200).json({
      success: true,
      shortfalls: result.rows.map(row => ({
        orderNumber: row.order_number,
        customerName: row.customer_name,
        totalAmount: parseFloat(row.total_amount),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
        paymentStatus: row.payment_status,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching shortfall payments:', error);
    return res.status(500).json({ error: 'Failed to fetch shortfall payments' });
  }
}
