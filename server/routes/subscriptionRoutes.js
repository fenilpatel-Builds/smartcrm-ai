import express from 'express';
import * as subController from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.post('/', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), subController.createSubscription);
router.get('/', subController.getSubscriptions);
router.get('/:id', subController.getSubscriptionById);

router.post('/:id/pause', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), subController.pauseSubscription);
router.post('/:id/resume', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), subController.resumeSubscription);
router.post('/:id/cancel', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), subController.cancelSubscription);
router.post('/:id/upgrade', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), subController.upgradeSubscription);
router.post('/:id/renew', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), subController.renewSubscription);
router.patch('/:id/status', authorizeRoles('owner', 'org_admin', 'manager', 'finance_manager', 'super_admin'), subController.transitionStatus);

export default router;
