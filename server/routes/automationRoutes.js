import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission } from '../middleware/roleMiddleware.js';
import { enforcePlanLimit } from '../middleware/planLimitMiddleware.js';
import * as automationController from '../controllers/automationController.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.get('/executions', automationController.getExecutions);
router.get('/', automationController.getRules);
router.post('/', enforcePlanLimit('automations'), automationController.createRule);
router.get('/:id', automationController.getRuleById);
router.put('/:id', automationController.updateRule);
router.patch('/:id/toggle', automationController.toggleRule);
router.post('/:id/trigger', automationController.triggerRuleManually);
router.delete('/:id', automationController.deleteRule);

export default router;
