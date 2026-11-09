import express from 'express';
import * as planController from '../controllers/planController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.post('/', authorizeRoles('owner', 'super_admin'), planController.createPlan);
router.get('/', planController.getPlans);
router.get('/:id', planController.getPlanById);
router.patch('/:id', authorizeRoles('owner', 'super_admin'), planController.updatePlan);
router.delete('/:id', authorizeRoles('owner', 'super_admin'), planController.deletePlan);

export default router;
