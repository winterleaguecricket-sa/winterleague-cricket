import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'landing-pages');

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  ensureUploadDir();

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
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

    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const mimeType = uploadedFile.mimetype || '';
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const filename = path.basename(uploadedFile.filepath);
    const publicUrl = `/uploads/landing-pages/${filename}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename,
    });
  });
}
