import express from 'express';
import * as customerController from '../controllers/customerController.js';
import * as interactionController from '../controllers/interactionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles, enforceWritePermission } from '../middleware/roleMiddleware.js';
import { enforcePlanLimit } from '../middleware/planLimitMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.post('/', enforcePlanLimit('customers'), customerController.createCustomer);
router.get('/', customerController.getCustomers);
router.get('/export/csv', customerController.exportCustomersCsv);
router.get('/duplicates', customerController.detectDuplicates);
router.get('/segments', customerController.getCustomerSegments);
router.post('/bulk', customerController.bulkCustomerActions);
router.post('/import', customerController.importCustomers);

router.get('/:id', customerController.getCustomerById);
router.patch('/:id', customerController.updateCustomer);
router.delete('/:id', authorizeRoles('owner', 'org_admin', 'manager', 'sales_manager', 'super_admin'), customerController.deleteCustomer);

// Nested interactions routes for customer
router.post('/:id/interactions', interactionController.createInteraction);
router.get('/:id/interactions', interactionController.getCustomerInteractions);

export default router;
