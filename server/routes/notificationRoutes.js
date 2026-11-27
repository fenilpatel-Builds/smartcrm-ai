import express from 'express';
import * as notifController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { registerSseClient } from '../services/notification/sseService.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.get('/stream', (req, res) => {
  registerSseClient(req, res, req.user.organizationId, req.user._id);
});

router.get('/', notifController.getNotifications);
router.patch('/:id/read', notifController.markAsRead);
router.patch('/read-all', notifController.markAllAsRead);

export default router;
