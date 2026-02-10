// API endpoint for admin settings (server-side only)
import { getAdminSettings, getEmailTemplate, updateAllAdminSettings, updateAdminEmail, updateEmailTemplate, updateSupplierEmail } from '../../data/adminSettings';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    try {
      const { template } = req.query;
      
      if (template) {
        // Get specific email template
        const emailTemplate = getEmailTemplate(template);
        if (!emailTemplate) {
          return res.status(404).json({ error: 'Template not found' });
        }
        return res.status(200).json(emailTemplate);
      }
      
      // Get all admin settings
      const settings = getAdminSettings();
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error getting admin settings:', error);
      return res.status(500).json({ error: 'Failed to get admin settings' });
    }
  }
  
  if (req.method === 'PUT') {
    try {
      const { action, ...data } = req.body;
      
      let updatedSettings;
      
      if (action === 'updateEmail') {
        updatedSettings = updateAdminEmail(data.email);
      } else if (action === 'updateSupplierEmail') {
        updatedSettings = updateSupplierEmail(data.supplierEmail);
      } else if (action === 'updateTemplate') {
        const template = updateEmailTemplate(data.templateName, {
          subject: data.subject,
          body: data.body
        });
        updatedSettings = getAdminSettings();
      } else {
        // Default: update all settings
        updatedSettings = updateAllAdminSettings(data);
      }
      
      return res.status(200).json(updatedSettings);
    } catch (error) {
      console.error('Error updating admin settings:', error);
      return res.status(500).json({ error: 'Failed to update admin settings' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
