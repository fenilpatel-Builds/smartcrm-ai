import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';

export const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, month, year, all

  const fetchReports = async () => {
    setLoading(true);
    try {
      let startDate = '';
      const now = new Date();

      if (dateRange === '7d') {
        const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString();
      } else if (dateRange === '30d') {
        const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString();
      } else if (dateRange === 'month') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = d.toISOString();
      } else if (dateRange === 'year') {
        const d = new Date(now.getFullYear(), 0, 1);
        startDate = d.toISOString();
      }

      const res = await api.get('/analytics/reports', {
        params: {
          startDate: startDate || undefined,
          endDate: now.toISOString(),
        },
      });

      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (e) {
      toast.error('Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const handleExportCSV = () => {
    if (!reportData) return;
    const { customerAcquisitions } = reportData;
    let csv = 'Customer,Email,Company,Source,Status,Created At\n';
    customerAcquisitions?.forEach((c) => {
      csv += `"${c.name}","${c.email}","${c.company || ''}","${c.source}","${c.lifecycleStatus}","${new Date(
        c.createdAt
      ).toLocaleDateString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_acquisitions_${dateRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported to CSV');
  };

  const summary = reportData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Financial & Retention Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audited financial receipts, customer acquisition velocity, and retention churn performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {[
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' },
              { id: 'all', label: 'All Time' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setDateRange(btn.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  dateRange === btn.id ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-teal-500">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Collected</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            ${(summary.totalCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Actual settled receipts</p>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <span className="text-xs font-semibold text-slate-500 uppercase">Customers Acquired</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {summary.totalAcquired || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">New accounts added</p>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Subscriptions</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {summary.totalSubscriptions || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">In current catalog</p>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-slate-500 uppercase">Calculated Churn Rate</span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">
            {summary.churnRate || 0}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Churned vs Acquired volume</p>
        </Card>
      </div>

      {/* Customer Acquisitions Breakdown */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Customer Acquisitions Breakdown ({reportData?.customerAcquisitions?.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Company</th>
                <th className="py-2.5 px-4">Source</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Date Acquired</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                  </tr>
                ))
              ) : reportData?.customerAcquisitions?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No customer acquisitions recorded for this interval.
                  </td>
                </tr>
              ) : (
                reportData?.customerAcquisitions?.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold">{c.name}</td>
                    <td className="py-3 px-4 text-slate-500">{c.company || '—'}</td>
                    <td className="py-3 px-4 capitalize text-slate-500">{c.source}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={c.lifecycleStatus === 'customer' ? 'success' : 'default'}
                      >
                        {c.lifecycleStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
