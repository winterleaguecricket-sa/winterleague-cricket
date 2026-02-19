import fs from 'fs';
import path from 'path';

const ADMIN_SETTINGS_FILE = path.join(process.cwd(), 'data', 'adminSettings.json');

// Load settings from file
function loadSettings() {
  try {
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
      const data = fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading admin settings:', error);
  }
  return null;
}

// Save settings to file
function saveSettings(settings) {
  try {
    fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving admin settings:', error);
    return false;
  }
}

export default function handler(req, res) {
  if (req.method === 'POST') {
    // Authenticate
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Load stored settings
    const storedSettings = loadSettings();
    const storedPassword = storedSettings?.password || '';
    
    // Environment password fallback
    const envPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    const defaultPassword = 'admin123';

    // Priority: stored password (if set) > env password > default
    const validPassword = storedPassword || envPassword || defaultPassword;

    if (password === validPassword) {
      // Set httpOnly cookie so middleware can verify admin access
      res.setHeader('Set-Cookie', 'adminAuth=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400');
      return res.status(200).json({ authenticated: true });
    }

    return res.status(401).json({ authenticated: false, error: 'Invalid password' });
    
  } else if (req.method === 'PUT') {
    // Update password
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Load stored settings
    const storedSettings = loadSettings();
    const storedPassword = storedSettings?.password || '';
    
    // Environment password fallback
    const envPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    const defaultPassword = 'admin123';

    // Priority: stored password (if set) > env password > default
    const validPassword = storedPassword || envPassword || defaultPassword;

    // Verify current password
    if (currentPassword !== validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Save new password
    const newSettings = storedSettings || { password: '' };
    newSettings.password = newPassword;

    if (saveSettings(newSettings)) {
      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to save password' });
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
