import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.post('/', authorizeRoles('owner', 'manager', 'super_admin'), invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);
router.patch('/:id', authorizeRoles('owner', 'manager', 'super_admin'), invoiceController.updateInvoice);
router.post('/:id/record-payment', authorizeRoles('owner', 'manager', 'super_admin'), invoiceController.recordInvoicePayment);

export default router;
