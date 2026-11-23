import express from 'express';
import * as commController from '../controllers/communicationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission, authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.get('/logs', commController.getEmailLogs);
router.post('/send', commController.sendEmailMessage);
router.post('/preview', commController.previewTemplate);
router.post('/test', authorizeRoles('owner', 'org_admin', 'super_admin'), commController.sendTestEmail);
router.get('/settings', commController.getEmailSettings);
router.post('/settings', authorizeRoles('owner', 'org_admin', 'super_admin'), commController.updateEmailSettings);

export default router;
