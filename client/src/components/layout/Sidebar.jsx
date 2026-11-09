import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  CreditCard,
  Layers,
  Receipt,
  FileText,
  CheckSquare,
  Sparkles,
  BarChart3,
  UserCheck,
  Settings,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isMobileOpen, onClose }) => {
  const { user, organization } = useAuth();

  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Leads & Pipeline', to: '/leads', icon: Target },
    { name: 'Subscriptions', to: '/subscriptions', icon: CreditCard },
    { name: 'Subscription Plans', to: '/plans', icon: Layers },
    { name: 'Payments', to: '/payments', icon: Receipt },
    { name: 'Invoices', to: '/invoices', icon: FileText },
    { name: 'Tasks & Follow-ups', to: '/tasks', icon: CheckSquare },
    { name: 'AI Retention & Radar', to: '/ai-insights', icon: Sparkles, badge: 'AI' },
    { name: 'Reports & Analytics', to: '/reports', icon: BarChart3 },
    ...(user?.role === 'owner' || user?.role === 'super_admin'
      ? [{ name: 'Team Management', to: '/settings/team', icon: UserCheck }]
      : []),
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white font-black shadow-md shadow-teal-500/20">
              S
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">
                SmartCRM
              </span>
              <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                AI & Subscriptions
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Workspace Pill */}
        <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Workspace
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {organization?.name || 'My Organization'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              {organization?.currency || 'USD'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => onClose && onClose()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize truncate">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
