import { Task } from '../models/Task.js';
import { logAudit } from '../services/audit/auditService.js';

export const createTask = async (req, res, next) => {
  try {
    const { customerId, assignedTo, title, description, priority = 'medium', dueDate } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Task title and due date are required.' });
    }

    const task = await Task.create({
      organizationId: req.organizationId,
      customerId: customerId || undefined,
      assignedTo: assignedTo || req.user._id,
      createdBy: req.user._id,
      title: title.trim(),
      description: description || '',
      priority,
      dueDate: new Date(dueDate),
      status: 'pending',
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_TASK',
      entityType: 'Task',
      entityId: task._id,
      metadata: { title: task.title, priority, dueDate },
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const { status, priority, customerId, assignedTo, overdue } = req.query;

    const query = { organizationId: req.organizationId };

    if (req.user.role === 'employee') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $in: ['pending', 'in_progress'] };
    }

    const tasks = await Task.find(query)
      .populate('customerId', 'name company email phone')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customerId')
      .populate('assignedTo')
      .populate('createdBy');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findOne({ _id: id, organizationId: req.organizationId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const allowed = ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'status', 'customerId'];
    allowed.forEach((f) => {
      if (updates[f] !== undefined) task[f] = updates[f];
    });

    if (updates.status === 'completed' && !task.completedAt) {
      task.completedAt = new Date();
    } else if (updates.status && updates.status !== 'completed') {
      task.completedAt = undefined;
    }

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, organizationId: req.organizationId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'COMPLETE_TASK',
      entityType: 'Task',
      entityId: task._id,
    });

    res.json({
      success: true,
      message: 'Task marked as completed',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Task.deleteOne({ _id: id, organizationId: req.organizationId });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
