import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Users,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

const EVENT_TYPE_COLORS = {
  meeting: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300',
  call: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300',
  demo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300',
  task_deadline: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300',
  renewal: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300',
  follow_up: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300',
};

export const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'meeting',
    startDate: '',
    endDate: '',
    location: '',
    meetUrl: '',
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const params = { start, end };
      if (typeFilter !== 'all') params.eventType = typeFilter;

      const res = await api.get('/calendar', { params });
      setEvents(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, typeFilter]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast.error('Title, start, and end time are required');
      return;
    }

    try {
      await api.post('/calendar', formData);
      toast.success('Event scheduled successfully');
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        eventType: 'meeting',
        startDate: '',
        endDate: '',
        location: '',
        meetUrl: '',
      });
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule event.');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.delete(`/calendar/${id}`);
      toast.success('Event deleted');
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  // Build calendar matrix
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  // Previous month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({ dayNumber: daysInPrevMonth - i, isCurrentMonth: false });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ dayNumber: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }
  // Next month padding
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ dayNumber: i, isCurrentMonth: false });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-teal-600" />
            CRM Calendar & Scheduled Events
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Coordinate customer demos, renewal check-ins, negotiation calls, and team follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              const now = new Date();
              const isoStart = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
              const isoEnd = new Date(now.getTime() - now.getTimezoneOffset() * 60000 + 3600000).toISOString().slice(0, 16);
              setFormData({
                title: '',
                description: '',
                eventType: 'meeting',
                startDate: isoStart,
                endDate: isoEnd,
                location: '',
                meetUrl: '',
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Schedule Event
          </Button>
        </div>
      </div>

      {/* Month Navigation & Controls Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={today} className="px-2.5 py-1 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-x border-slate-200 dark:border-slate-800">
              Today
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Event Types</option>
            <option value="meeting">Meetings</option>
            <option value="call">Phone Calls</option>
            <option value="demo">Product Demos</option>
            <option value="renewal">Contract Renewals</option>
            <option value="follow_up">Follow-ups</option>
          </select>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="grid grid-cols-7 text-center font-bold text-xs uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2.5">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
          {days.map((item, idx) => {
            const isToday =
              item.isCurrentMonth &&
              item.date &&
              new Date().toDateString() === item.date.toDateString();

            const dayEvents = item.isCurrentMonth
              ? events.filter((ev) => {
                  const evDate = new Date(ev.startDate);
                  return evDate.toDateString() === item.date.toDateString();
                })
              : [];

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-1.5 transition-colors ${
                  item.isCurrentMonth
                    ? isToday
                      ? 'bg-teal-50/40 dark:bg-teal-950/20'
                      : 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-300 dark:text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-teal-600 text-white'
                        : item.isCurrentMonth
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {item.dayNumber}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[85px]">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev._id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full text-left px-1.5 py-1 rounded text-[11px] font-semibold truncate border block hover:opacity-85 ${
                        EVENT_TYPE_COLORS[ev.eventType] || 'bg-slate-100 text-slate-700'
                      }`}
                      title={ev.title}
                    >
                      {new Date(ev.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      {ev.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Calendar Event"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="e.g. Acme Q4 Product Demonstration"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Type
              </label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                <option value="meeting">General Meeting</option>
                <option value="call">Phone Call</option>
                <option value="demo">Product Demo</option>
                <option value="renewal">Contract Renewal</option>
                <option value="follow_up">Customer Follow-up</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Video Meet URL
              </label>
              <input
                type="text"
                value={formData.meetUrl}
                onChange={(e) => setFormData({ ...formData, meetUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                placeholder="https://meet.google.com/xyz"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Agenda
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="Meeting agenda, objectives, discussion points..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Schedule Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.title}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${EVENT_TYPE_COLORS[selectedEvent.eventType]}`}>
                {selectedEvent.eventType.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-500">
                Created by {selectedEvent.createdBy?.name || 'User'}
              </span>
            </div>

            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>
                  {new Date(selectedEvent.startDate).toLocaleString()} —{' '}
                  {new Date(selectedEvent.endDate).toLocaleTimeString()}
                </span>
              </div>
              {selectedEvent.meetUrl && (
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-600" />
                  <a
                    href={selectedEvent.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline break-all"
                  >
                    {selectedEvent.meetUrl}
                  </a>
                </div>
              )}
              {selectedEvent.description && (
                <p className="pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                  {selectedEvent.description}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 flex items-center gap-1.5"
                onClick={() => handleDeleteEvent(selectedEvent._id)}
              >
                <Trash2 className="w-4 h-4" />
                Delete Event
              </Button>
              <Button type="button" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarView;
