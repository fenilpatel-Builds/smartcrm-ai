import express from 'express';
import * as leadController from '../controllers/leadController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.post('/', leadController.createLead);
router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLeadById);
router.patch('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

router.patch('/:id/stage', leadController.updateLeadStage);
router.post('/:id/convert', leadController.convertLeadToCustomer);

export default router;
