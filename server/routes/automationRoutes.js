import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import * as automationController from '../controllers/automationController.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.get('/executions', automationController.getExecutions);
router.get('/', automationController.getRules);
router.post('/', automationController.createRule);
router.get('/:id', automationController.getRuleById);
router.put('/:id', automationController.updateRule);
router.patch('/:id/toggle', automationController.toggleRule);
router.post('/:id/trigger', automationController.triggerRuleManually);
router.delete('/:id', automationController.deleteRule);

export default router;
