import express from 'express';
import * as customerController from '../controllers/customerController.js';
import * as interactionController from '../controllers/interactionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.post('/', customerController.createCustomer);
router.get('/', customerController.getCustomers);
router.post('/bulk', customerController.bulkCustomerActions);
router.post('/import', customerController.importCustomers);

router.get('/:id', customerController.getCustomerById);
router.patch('/:id', customerController.updateCustomer);
router.delete('/:id', authorizeRoles('owner', 'manager', 'super_admin'), customerController.deleteCustomer);

// Nested interactions routes for customer
router.post('/:id/interactions', interactionController.createInteraction);
router.get('/:id/interactions', interactionController.getCustomerInteractions);

export default router;
