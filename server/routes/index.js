import express from 'express';
import authRoutes from './authRoutes.js';
import organizationRoutes from './organizationRoutes.js';
import customerRoutes from './customerRoutes.js';
import leadRoutes from './leadRoutes.js';
import planRoutes from './planRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import interactionRoutes from './interactionRoutes.js';
import taskRoutes from './taskRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import insightRoutes from './insightRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SmartCRM API',
    version: '1.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/customers', customerRoutes);
router.use('/leads', leadRoutes);
router.use('/plans', planRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/interactions', interactionRoutes);
router.use('/tasks', taskRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/insights', insightRoutes);
router.use('/notifications', notificationRoutes);

export default router;
