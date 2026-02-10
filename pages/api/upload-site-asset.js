import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'site-settings');

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  ensureUploadDir();

  const { type = 'asset' } = req.query;
  const isVideoAllowed = type === 'hero' || type === 'media' || type === 'video';

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: isVideoAllowed ? 25 * 1024 * 1024 : 5 * 1024 * 1024,
    filename: (name, ext) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      return `site-${type}-${timestamp}-${random}${ext}`;
    },
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

    if (isVideoAllowed) {
      if (![...IMAGE_TYPES, ...VIDEO_TYPES].includes(mimeType)) {
        return res.status(400).json({ error: 'Invalid media type' });
      }
    } else if (!IMAGE_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }

    const publicUrl = `/uploads/site-settings/${path.basename(uploadedFile.filepath)}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: path.basename(uploadedFile.filepath),
      mimeType,
    });
  });
}
