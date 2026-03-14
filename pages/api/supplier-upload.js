import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function ensureUploadDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { docType = 'document' } = req.query;
  const uploadId = crypto.randomBytes(8).toString('hex');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'supplier-docs', uploadId);
  ensureUploadDir(uploadDir);

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZE,
    filename: (name, ext) => {
      const safeType = String(docType).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
      return `${safeType}${ext}`;
    },
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Supplier doc upload error:', err);
      try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch (e) {}
      return res.status(500).json({ error: 'File upload failed' });
    }

    const file = files.file;
    if (!file) {
      try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch (e) {}
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const mimeType = uploadedFile.mimetype || '';

    if (!ALLOWED_TYPES.includes(mimeType)) {
      try { fs.unlinkSync(uploadedFile.filepath); } catch (e) {}
      try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch (e) {}
      return res.status(400).json({
        error: 'Invalid file type. Accepted: JPG, PNG, GIF, WebP, PDF, DOC, DOCX'
      });
    }

    const relativePath = `/uploads/supplier-docs/${uploadId}/${path.basename(uploadedFile.filepath)}`;

    return res.status(200).json({
      url: relativePath,
      docType,
      size: uploadedFile.size,
      type: mimeType
    });
  });
}
