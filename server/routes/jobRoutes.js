import express from 'express';
import * as jobController from '../controllers/jobController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant, authorizeRoles('owner', 'org_admin', 'super_admin'));

router.get('/metrics', jobController.getJobMetrics);
router.post('/trigger', jobController.triggerJobNow);
router.post('/:id/retry', jobController.retryJob);

export default router;
