import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission } from '../middleware/roleMiddleware.js';
import * as calendarController from '../controllers/calendarController.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.get('/', calendarController.getEvents);
router.post('/', calendarController.createEvent);
router.put('/:id', calendarController.updateEvent);
router.delete('/:id', calendarController.deleteEvent);

export default router;
