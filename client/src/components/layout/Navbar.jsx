import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  User as UserIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onOpenMobileMenu, onOpenAIAssistant }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef();
  const profileRef = useRef();

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      // quiet fail on background poller
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // 45s poll
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGlobalSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Left Area: Mobile menu & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers, companies, or press Enter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleGlobalSearch}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-teal-500 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all focus:outline-none"
          />
        </div>
      </div>

      {/* Right Area: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Ask AI Assistant Button */}
        <button
          onClick={onOpenAIAssistant}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 hover:from-teal-500/20 hover:to-emerald-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-xs font-bold transition shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
          <span className="hidden md:inline">Ask AI Assistant</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Notifications ({unreadCount} new)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No new notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-start gap-3 ${
                        !n.isRead ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'overdue_payment' || n.type === 'churn_alert' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        ) : n.type === 'renewal' ? (
                          <Clock className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-teal-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center font-bold text-white text-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 p-2">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                Profile Settings
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
