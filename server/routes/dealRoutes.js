import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission } from '../middleware/roleMiddleware.js';
import { enforcePlanLimit } from '../middleware/planLimitMiddleware.js';
import * as dealController from '../controllers/dealController.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.get('/pipeline', dealController.getPipelineView);
router.get('/forecast', dealController.getDealForecast);
router.get('/', dealController.getDeals);
router.post('/', enforcePlanLimit('deals'), dealController.createDeal);
router.get('/:id', dealController.getDealById);
router.put('/:id', dealController.updateDeal);
router.patch('/:id/stage', dealController.updateDealStage);
router.delete('/:id', dealController.deleteDeal);

export default router;
