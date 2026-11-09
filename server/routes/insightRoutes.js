import express from 'express';
import * as insightController from '../controllers/insightController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.post('/analyze/:customerId', insightController.analyzeCustomerChurn);
router.get('/customer/:customerId', insightController.getCustomerInsights);
router.get('/high-risk', insightController.getHighRiskCustomers);
router.get('/recommendations', insightController.getUpsellRecommendations);
router.post('/customer-summary/:customerId', insightController.generateCustomerSummary);
router.post('/generate-message/:customerId', insightController.generateMessage);
router.post('/assistant', insightController.queryAssistant);

export default router;
