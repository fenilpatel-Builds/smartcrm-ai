import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Users2,
  Building2,
  Target,
  Kanban,
  Calendar,
  MessageSquare,
  CreditCard,
  Layers,
  Receipt,
  FileText,
  BarChart3,
  CheckSquare,
  LifeBuoy,
  FolderArchive,
  Zap,
  Sparkles,
  Bot,
  Shield,
  UserCheck,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isMobileOpen, onClose }) => {
  const { user, organization } = useAuth();

  const navSections = [
    {
      title: 'Sales & CRM',
      items: [
        { name: 'Overview', to: '/', icon: LayoutDashboard },
        { name: 'Customers', to: '/customers', icon: Users },
        { name: 'Contacts', to: '/contacts', icon: Users2 },
        { name: 'Companies', to: '/companies', icon: Building2 },
        { name: 'Leads & Prospects', to: '/leads', icon: Target },
        { name: 'Deals & Pipeline', to: '/deals', icon: Kanban },
        { name: 'Calendar & Meetings', to: '/calendar', icon: Calendar },
        { name: 'Communication Hub', to: '/communication', icon: MessageSquare },
      ],
    },
    {
      title: 'Subscriptions & Finance',
      items: [
        { name: 'Subscriptions', to: '/subscriptions', icon: CreditCard },
        { name: 'Plans & Pricing', to: '/plans', icon: Layers },
        { name: 'Payments', to: '/payments', icon: Receipt },
        { name: 'Invoices', to: '/invoices', icon: FileText },
        { name: 'Financial Reports', to: '/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'Operations & Service',
      items: [
        { name: 'Tasks & Follow-ups', to: '/tasks', icon: CheckSquare },
        { name: 'Support Tickets', to: '/tickets', icon: LifeBuoy },
        { name: 'Document Vault', to: '/documents', icon: FolderArchive },
        { name: 'Workflow Automation', to: '/automation', icon: Zap },
      ],
    },
    {
      title: 'AI Intelligence',
      items: [
        { name: 'AI Retention & Radar', to: '/ai-insights', icon: Sparkles, badge: 'AI' },
        { name: 'AI CRM Copilot', to: '/ai-assistant', icon: Bot, badge: 'PRO' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { name: 'Compliance Audit Trail', to: '/audit-logs', icon: Shield },
        ...(user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'org_admin'
          ? [{ name: 'Team Management', to: '/settings/team', icon: UserCheck }]
          : []),
        { name: 'Workspace Settings', to: '/settings', icon: Settings },
      ],
    },
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
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
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
        <div className="px-4 py-2.5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
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

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Card in Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 truncate capitalize">
                {user?.role?.replace('_', ' ') || 'Owner'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
