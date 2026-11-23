import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission } from '../middleware/roleMiddleware.js';
import { enforcePlanLimit } from '../middleware/planLimitMiddleware.js';
import * as documentController from '../controllers/documentController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/documents');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${basename}${ext}`);
  },
});

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.js', '.msi', '.php', '.py', '.ps1', '.dll', '.com'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type '${ext}' is blocked for security reasons.`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.get('/metrics', documentController.getDocumentMetrics);
router.get('/', documentController.getDocuments);
router.post('/upload', enforcePlanLimit('storage'), upload.single('file'), documentController.uploadDocument);
router.get('/:id/download', documentController.downloadDocument);
router.delete('/:id', documentController.deleteDocument);

export default router;
