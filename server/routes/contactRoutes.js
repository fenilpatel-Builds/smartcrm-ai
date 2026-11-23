import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission } from '../middleware/roleMiddleware.js';
import { enforcePlanLimit } from '../middleware/planLimitMiddleware.js';
import * as contactController from '../controllers/contactController.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.get('/', contactController.getContacts);
router.post('/', enforcePlanLimit('contacts'), contactController.createContact);
router.get('/:id', contactController.getContactById);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

export default router;
