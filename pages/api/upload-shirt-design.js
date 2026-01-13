import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'shirt-designs');

  // Create upload directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new IncomingForm({
    uploadDir: uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
    filename: (name, ext, part, form) => {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      return `shirt-design-${timestamp}-${random}${ext}`;
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'File upload failed' });
    }

    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get the uploaded file
    const uploadedFile = Array.isArray(file) ? file[0] : file;
    
    // Return the public URL
    const publicUrl = `/uploads/shirt-designs/${path.basename(uploadedFile.filepath)}`;
    
    res.status(200).json({ 
      success: true, 
      url: publicUrl,
      filename: path.basename(uploadedFile.filepath)
    });
  });
}
