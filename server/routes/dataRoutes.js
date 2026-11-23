import express from 'express';
import * as dataController from '../controllers/dataController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission, authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.post('/import/:entityType', dataController.importCsv);
router.get('/export/:entityType', dataController.exportCsv);

export default router;
