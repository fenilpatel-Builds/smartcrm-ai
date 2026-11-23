import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Webhook endpoint: external payment providers authenticate via HMAC signature
router.post('/webhook', express.json(), paymentController.handleWebhook);

router.use(authenticate, enforceTenant);

router.get('/config', paymentController.getPaymentConfig);
router.post('/create-order', paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);
router.post('/settings', authorizeRoles('owner', 'org_admin', 'super_admin'), paymentController.updatePaymentSettings);
router.post('/:id/refund', authorizeRoles('owner', 'org_admin', 'finance_manager', 'super_admin'), paymentController.refundPayment);

router.post('/', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), paymentController.recordPayment);
router.get('/', paymentController.getPayments);
router.get('/overdue', paymentController.getOverduePayments);
router.get('/:id', paymentController.getPaymentById);
router.patch('/:id/status', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), paymentController.updatePaymentStatus);

export default router;
