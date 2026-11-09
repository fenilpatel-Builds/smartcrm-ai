import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.post('/', authorizeRoles('owner', 'manager', 'super_admin'), paymentController.recordPayment);
router.get('/', paymentController.getPayments);
router.get('/overdue', paymentController.getOverduePayments);
router.get('/:id', paymentController.getPaymentById);
router.patch('/:id/status', authorizeRoles('owner', 'manager', 'super_admin'), paymentController.updatePaymentStatus);

export default router;
