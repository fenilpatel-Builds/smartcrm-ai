import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

export const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customerId: '',
    priority: 'medium',
    dueDate: '',
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        },
      });
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (e) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers', { params: { limit: 100 } });
      if (res.data.success) setCustomers(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchCustomers();
  }, [statusFilter, priorityFilter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/tasks', formData);
      if (res.data.success) {
        toast.success('Task created successfully!');
        setIsModalOpen(false);
        setFormData({ title: '', description: '', customerId: '', priority: 'medium', dueDate: '' });
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating task');
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      if (task.status === 'completed') {
        await api.patch(`/tasks/${task._id}`, { status: 'pending' });
        toast.success('Task reopened.');
      } else {
        await api.patch(`/tasks/${task._id}/complete`);
        toast.success('Task marked as completed!');
      }
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task removed.');
      fetchTasks();
    } catch (e) {
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Tasks & Follow-ups
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize customer check-ins, scheduled renewals, and overdue invoice collection tasks.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Task
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
            >
              <option value="pending">Pending Only</option>
              <option value="completed">Completed</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))
        ) : tasks.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-400">
            No tasks found matching current filters.
          </div>
        ) : (
          tasks.map((task) => {
            const isOverdue =
              new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <Card
                key={task._id}
                className={`p-4 flex flex-col justify-between border-l-4 transition ${
                  task.status === 'completed'
                    ? 'border-l-emerald-500 opacity-60'
                    : isOverdue
                    ? 'border-l-rose-500 bg-rose-50/20'
                    : task.priority === 'urgent'
                    ? 'border-l-rose-500'
                    : task.priority === 'high'
                    ? 'border-l-amber-500'
                    : 'border-l-teal-500'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className={`p-1 rounded-lg border transition ${
                          task.status === 'completed'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </button>
                      <h3
                        className={`text-sm font-bold ${
                          task.status === 'completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </h3>
                    </div>

                    <Badge
                      variant={
                        task.priority === 'urgent'
                          ? 'danger'
                          : task.priority === 'high'
                          ? 'warning'
                          : 'primary'
                      }
                    >
                      {task.priority.toUpperCase()}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 ml-7">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 ml-7">
                  <div className="flex items-center gap-4">
                    {task.customerId && (
                      <Link
                        to={`/customers/${task.customerId._id}`}
                        className="font-bold text-teal-600 hover:underline"
                      >
                        {task.customerId.name}
                      </Link>
                    )}
                    <span
                      className={`flex items-center gap-1 ${
                        isOverdue ? 'text-rose-600 font-bold' : ''
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Follow-up Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title *"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Call regarding overdue invoice #ACME-2026-0005"
          />

          <Select
            label="Linked Customer (Optional)"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
          >
            <option value="">-- Unlinked / General Task --</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.company ? `(${c.company})` : ''}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date *"
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />

            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Details or specific talking points..."
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
