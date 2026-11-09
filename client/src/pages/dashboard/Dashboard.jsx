import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const revenueTrend = data?.revenueTrend || [];
  const subscriptionDistribution = data?.subscriptionDistribution || [];
  const planRevenue = data?.planRevenue || [];
  const customerLifecycle = data?.customerLifecycle || [];
  const highRiskInsights = data?.highRiskInsights || [];
  const upcomingRenewalsList = data?.upcomingRenewalsList || [];
  const recentActivities = data?.recentActivities || [];

  const PIE_COLORS = ['#0d9488', '#38bdf8', '#f59e0b', '#ef4444', '#a855f7'];

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Revenue & Customer Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time normalized recurring revenue, customer churn signals, and retention metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/customers">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4" />
              Manage Customers
            </Button>
          </Link>
          <Link to="/ai-insights">
            <Button variant="primary" size="sm">
              <Sparkles className="w-4 h-4" />
              AI Retention Radar
            </Button>
          </Link>
        </div>
      </div>

      {/* 8 Top-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <Card className="border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Recurring (MRR)
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {kpis.mrr?.label || '$0'}
            </span>
            <span className="text-[11px] font-semibold text-teal-600 flex items-center">
              Normalized
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active subscriptions run-rate</p>
        </Card>

        {/* ARR */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Annual Recurring (ARR)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {kpis.arr?.label || '$0'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">MRR × 12</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Annual projected revenue</p>
        </Card>

        {/* Total Customers */}
        <Card className="border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {kpis.totalCustomers?.value || 0}
            </span>
            {kpis.totalCustomers?.change !== undefined && (
              <span
                className={`text-[11px] font-bold flex items-center ${
                  kpis.totalCustomers.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {kpis.totalCustomers.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                )}
                {kpis.totalCustomers.change}% (30d)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Active: {kpis.activeCustomers?.value || 0} accounts
          </p>
        </Card>

        {/* Total Subscriptions */}
        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Subscriptions
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {kpis.totalSubscriptions?.value || 0}
            </span>
            <Badge variant="primary">Active & Trial</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Excludes cancelled/paused</p>
        </Card>

        {/* Upcoming Renewals */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Upcoming Renewals
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {kpis.upcomingRenewals?.count || 0}
            </span>
            <span className="text-[11px] font-semibold text-amber-600">Next 30 Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Subscriptions pending renewal</p>
        </Card>

        {/* High Risk Customers */}
        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              High-Risk Accounts
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-600">
              {kpis.highRiskCustomers?.count || 0}
            </span>
            <Badge variant="danger">AI Flagged</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires immediate outreach</p>
        </Card>

        {/* Pending Payments */}
        <Card className="border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending / Overdue Invoices
            </span>
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              ${(kpis.pendingPayments?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-bold text-orange-600">
              {kpis.pendingPayments?.count || 0} invoices
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Uncollected accounts receivable</p>
        </Card>

        {/* Customer Health Score */}
        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AI Retention Health
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {kpis.totalCustomers?.value
                ? Math.round(
                    ((kpis.totalCustomers.value - (kpis.highRiskCustomers?.count || 0)) /
                      kpis.totalCustomers.value) *
                      100
                  )
                : 100}
              %
            </span>
            <span className="text-[11px] font-semibold text-purple-600">Healthy</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Retention stability ratio</p>
        </Card>
      </div>

      {/* Visualizations Section: Revenue Trend & Subscription Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend Area Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Monthly Collected Revenue Trend
              </h3>
              <p className="text-xs text-slate-400">Verified payment receipts over the last 6 months</p>
            </div>
            <Badge variant="primary">Collected Only</Badge>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Subscription Distribution Donut Chart */}
        <Card>
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Subscription Status Split
            </h3>
            <p className="text-xs text-slate-400">Active vs Paused vs Cancelled</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {subscriptionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Plan Breakdown & Customer Lifecycle Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Subscription Plan */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Estimated MRR by Subscription Plan
              </h3>
              <p className="text-xs text-slate-400">Breakdown of tier contributions</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="planName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  formatter={(val) => [`$${val.toLocaleString()}`, 'Estimated MRR']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="estimatedMRR" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Customer Lifecycle Distribution */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Customer Lifecycle Pipeline
              </h3>
              <p className="text-xs text-slate-400">Volume across lifecycle stages</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerLifecycle} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Operational Grids: High-Risk Radar & Upcoming Renewals & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High Risk Retention Radar List */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                High-Risk Customer Radar
              </h3>
            </div>
            <Link to="/ai-insights" className="text-xs font-semibold text-teal-600 hover:text-teal-500">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {highRiskInsights.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No high-risk churn signals detected.</p>
            ) : (
              highRiskInsights.map((insight) => (
                <Link
                  key={insight._id}
                  to={`/customers/${insight.customerId?._id}`}
                  className="block p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-rose-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {insight.customerId?.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      Risk: {insight.riskScore}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {insight.customerId?.company || 'Individual Account'}
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 leading-snug">
                    ⚠️ {insight.riskFactors?.[0] || 'Retention alert'}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Renewals Table */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Upcoming Renewals
              </h3>
            </div>
            <Link to="/subscriptions" className="text-xs font-semibold text-teal-600 hover:text-teal-500">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingRenewalsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No subscriptions renewing in next 30 days.</p>
            ) : (
              upcomingRenewalsList.map((sub) => (
                <div
                  key={sub._id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {sub.customerId?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {sub.planId?.name} • ${sub.amount}/{sub.billingFrequency}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {new Date(sub.nextRenewalDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Operational Activities */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Interactions
              </h3>
            </div>
            <Link to="/tasks" className="text-xs font-semibold text-teal-600 hover:text-teal-500">
              Tasks
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent interactions logged.</p>
            ) : (
              recentActivities.slice(0, 5).map((act) => (
                <div
                  key={act._id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {act.subject}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.interactionDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {act.customerId?.name} • by {act.userId?.name || 'Team member'}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
