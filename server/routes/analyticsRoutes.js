import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.get('/dashboard', analyticsController.getDashboardAnalytics);
router.get('/reports', analyticsController.getReports);

export default router;
