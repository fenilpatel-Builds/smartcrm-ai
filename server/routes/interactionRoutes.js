import express from 'express';
import * as interactionController from '../controllers/interactionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.patch('/:id', interactionController.updateInteraction);
router.delete('/:id', interactionController.deleteInteraction);

export default router;
