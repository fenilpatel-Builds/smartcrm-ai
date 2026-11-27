import express from 'express';
import {
  getPortalData,
  createPortalPaymentOrder,
  verifyPortalPayment,
  createPortalSupportTicket,
  generateCustomerPortalLink,
} from '../controllers/portalController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public portal routes (authenticated by token)
router.get('/view/:token', getPortalData);
router.post('/pay-invoice/:token', createPortalPaymentOrder);
router.post('/verify-payment/:token', verifyPortalPayment);
router.post('/support-ticket/:token', createPortalSupportTicket);

// CRM staff authenticated route to generate or fetch customer portal link
router.post('/generate-link/:customerId', authenticate, generateCustomerPortalLink);

export default router;
