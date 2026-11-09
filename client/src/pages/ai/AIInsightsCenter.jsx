import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Bot,
  Send,
  User,
  ArrowRight,
  ExternalLink,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export const AIInsightsCenter = () => {
  const [highRiskList, setHighRiskList] = useState([]);
  const [upsellList, setUpsellList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Embedded Assistant State
  const [assistantMessages, setAssistantMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your SmartCRM Business Assistant. Ask me questions about MRR, renewals, high-risk churn, or overdue balances.',
    },
  ]);
  const [queryInput, setQueryInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const [riskRes, upsellRes] = await Promise.all([
        api.get('/insights/high-risk'),
        api.get('/insights/recommendations'),
      ]);
      if (riskRes.data.success) setHighRiskList(riskRes.data.data);
      if (upsellRes.data.success) setUpsellList(upsellRes.data.data);
    } catch (e) {
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleAssistantSubmit = async (e, directQuery) => {
    if (e) e.preventDefault();
    const q = directQuery || queryInput;
    if (!q.trim() || assistantLoading) return;

    setAssistantMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setQueryInput('');
    setAssistantLoading(true);

    try {
      const res = await api.post('/insights/assistant', { query: q });
      if (res.data.success) {
        setAssistantMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: res.data.data.answer,
            data: res.data.data.data,
          },
        ]);
      }
    } catch (err) {
      setAssistantMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Error querying CRM database.' },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              AI Retention & Revenue Radar
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Proactive churn signal detection, expansion recommendations, and natural language workspace intelligence.
          </p>
        </div>
      </div>

      {/* High-Risk Accounts Section */}
      <Card className="p-0 overflow-hidden border-t-4 border-t-rose-500">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Retention Radar: Flagged At-Risk Accounts
              </h3>
              <p className="text-xs text-slate-400">
                Accounts with payment failures, renewal proximity without contact, or low interaction velocity.
              </p>
            </div>
          </div>
          <Badge variant="danger">{highRiskList.length} Accounts Monitored</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Primary Risk Factors</th>
                <th className="py-3 px-4">Recommended Retention Action</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </td>
                  </tr>
                ))
              ) : highRiskList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No high-risk customer signals currently detected.
                  </td>
                </tr>
              ) : (
                highRiskList.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/customers/${item.customerId?._id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 flex items-center gap-1"
                      >
                        {item.customerId?.name}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <p className="text-[11px] text-slate-400">{item.customerId?.company}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        {item.riskScore} / 100 ({item.riskLevel})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                      {item.riskFactors?.[0] || 'Inactivity'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-teal-700 dark:text-teal-400 max-w-xs">
                      {item.recommendations?.[0] || 'Reach out to account'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link to={`/customers/${item.customerId?._id}`}>
                        <Button variant="outline" size="sm">
                          Review Account
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Natural Language AI Assistant Chat */}
      <Card className="border-t-4 border-t-teal-500 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Interactive AI Business Assistant
              </h3>
              <p className="text-xs text-slate-400">
                Queries your authorized MongoDB records in real time to calculate live metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Quick query pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {[
            'What is our current MRR?',
            'Which customers are at high risk of churn?',
            'Which customers have overdue payments?',
            'Which subscriptions expire this week?',
            'Who should we contact today?',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleAssistantSubmit(null, prompt)}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap transition border border-slate-200 dark:border-slate-700"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="max-h-80 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          {assistantMessages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
              {msg.sender === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {assistantLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              Computing real database aggregations...
            </div>
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleAssistantSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask about MRR, renewals, high-risk accounts, or overdue payments..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            disabled={assistantLoading}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <Button type="submit" variant="primary" disabled={assistantLoading || !queryInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
};
