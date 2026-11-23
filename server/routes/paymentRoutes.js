import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Webhook endpoint: external payment providers authenticate via HMAC signature
router.post('/webhook', express.json(), paymentController.handleWebhook);

router.use(authenticate, enforceTenant);

router.post('/', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), paymentController.recordPayment);
router.get('/', paymentController.getPayments);
router.get('/overdue', paymentController.getOverduePayments);
router.get('/:id', paymentController.getPaymentById);
router.patch('/:id/status', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), paymentController.updatePaymentStatus);

export default router;
