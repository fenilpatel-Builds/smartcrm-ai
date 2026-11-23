import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';
import { enforceWritePermission } from '../middleware/roleMiddleware.js';
import * as ticketController from '../controllers/ticketController.js';

const router = express.Router();

router.use(authenticate, enforceTenant, enforceWritePermission);

router.get('/metrics', ticketController.getTicketMetrics);
router.get('/', ticketController.getTickets);
router.post('/', ticketController.createTicket);
router.get('/:id', ticketController.getTicketById);
router.put('/:id', ticketController.updateTicket);
router.post('/:id/messages', ticketController.addTicketMessage);

export default router;
