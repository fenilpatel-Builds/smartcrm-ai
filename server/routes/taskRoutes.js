import express from 'express';
import * as taskController from '../controllers/taskController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate, enforceTenant);

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/complete', taskController.completeTask);

export default router;
