// API endpoint for customer profiles - Full CRUD via database
import {
  getAllProfiles,
  getProfileById,
  getProfileByEmail,
  createProfile,
  updateProfile,
  deleteProfile,
  verifyCredentials,
  resetPassword,
  generateResetCode,
  addOrderToProfile
} from '../../data/customers-db';
import { query } from '../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { id, email } = req.query;

      if (email) {
        const profile = await getProfileByEmail(email);
        if (!profile) {
          return res.status(404).json({ error: 'Customer not found' });
        }
        const { password, ...safeProfile } = profile;
        return res.status(200).json({ customer: safeProfile });
      }

      if (id) {
        const profile = await getProfileById(id);
        if (!profile) {
          return res.status(404).json({ error: 'Customer not found' });
        }
        const { password, ...safeProfile } = profile;
        return res.status(200).json({ customer: safeProfile });
      }

      const profiles = await getAllProfiles();
      // Include order count for each customer (used by admin directory)
      const orderCountResult = await query(
        'SELECT customer_email, COUNT(*)::int AS order_count FROM orders GROUP BY customer_email'
      );
      const orderCountMap = {};
      for (const row of orderCountResult.rows) {
        orderCountMap[row.customer_email?.toLowerCase()] = row.order_count;
      }
      const sanitized = profiles.map(({ password, ...rest }) => ({
        ...rest,
        orderCount: orderCountMap[rest.email?.toLowerCase()] || 0
      }));
      return res.status(200).json({ customers: sanitized });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      if (action === 'login') {
        const { email, password } = req.body;
        const result = await verifyCredentials(email, password);
        return res.status(result.authenticated ? 200 : 401).json(result);
      }

      if (action === 'register' || action === 'create') {
        const result = await createProfile(req.body);
        if (result.error && !result.profile) {
          return res.status(400).json(result);
        }
        if (result.profile) {
          const { password, ...safeProfile } = result.profile;
          return res.status(200).json({ profile: safeProfile, error: result.error || null });
        }
        return res.status(400).json(result);
      }

      if (action === 'lookup') {
        const { email } = req.body;
        const profile = await getProfileByEmail(email);
        if (!profile) {
          return res.status(200).json({ found: false });
        }
        const { password, ...safeProfile } = profile;
        return res.status(200).json({ found: true, profile: safeProfile });
      }

      if (action === 'generate-reset-code') {
        const { email } = req.body;
        const result = await generateResetCode(email);
        return res.status(result.success ? 200 : 400).json(result);
      }

      if (action === 'reset-password') {
        const { email, newPassword, verificationCode } = req.body;
        const result = await resetPassword(email, newPassword, verificationCode);
        return res.status(result.success ? 200 : 400).json(result);
      }

      if (action === 'add-order') {
        const { profileId, orderData } = req.body;
        const order = await addOrderToProfile(profileId, orderData);
        if (!order) {
          return res.status(404).json({ error: 'Profile not found or order creation failed' });
        }
        return res.status(200).json({ order });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      const updated = await updateProfile(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      const { password, ...safeProfile } = updated;
      return res.status(200).json({ customer: safeProfile });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      const deleted = await deleteProfile(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Customer API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
