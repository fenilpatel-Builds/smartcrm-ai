import express from 'express';
import * as orgController from '../controllers/organizationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/current', enforceTenant, orgController.getCurrentOrganization);
router.patch('/current', enforceTenant, authorizeRoles('owner', 'super_admin'), orgController.updateCurrentOrganization);
router.get('/members', enforceTenant, orgController.getMembers);
router.post('/invite', enforceTenant, authorizeRoles('owner', 'super_admin'), orgController.inviteMember);
router.patch('/members/:id/role', enforceTenant, authorizeRoles('owner', 'super_admin'), orgController.updateMemberRole);
router.get('/all', authorizeRoles('super_admin'), orgController.listAllOrganizations);

export default router;
