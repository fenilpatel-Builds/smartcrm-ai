import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, ArrowUpRight, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export const AIAssistantDrawer = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! I am your SmartCRM Business Assistant. Ask me anything about your current MRR, high-risk customer retention, upcoming renewals, or overdue payments.",
      timestamp: new Date(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'What is our current MRR?',
    'Which customers are at high risk of churn?',
    'Which customers have overdue payments?',
    'Which subscriptions expire soon?',
    'Who should we contact today?',
    'Which plans generate the highest revenue?',
  ];

  const handleSend = async (queryText) => {
    const query = queryText || inputQuery;
    if (!query.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await api.post('/insights/assistant', { query });
      if (response.data.success) {
        const assistantMsg = {
          sender: 'assistant',
          text: response.data.data.answer,
          data: response.data.data.data,
          category: response.data.data.category,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sorry, I encountered an error querying the intelligence engine. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base">SmartCRM Business Assistant</h3>
                <p className="text-xs text-teal-100">Live Workspace Intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto text-xs">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 text-slate-700 dark:text-slate-300 font-medium transition shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-300 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-teal-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Render related data items if available */}
                  {msg.data && msg.data.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Matched Records ({msg.data.length}):
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {msg.data.map((item, dIdx) => (
                          <div
                            key={dIdx}
                            className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                          >
                            <span className="font-medium truncate max-w-[200px]">
                              {item.name || item.customerName || item.title || item.invoiceNumber}
                            </span>
                            {item.riskScore !== undefined && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.riskScore > 65
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                Risk: {item.riskScore}/100
                              </span>
                            )}
                            {item.balanceDue !== undefined && (
                              <span className="font-bold text-rose-600">
                                Overdue: ${item.balanceDue.toFixed(2)}
                              </span>
                            )}
                            {item.amount !== undefined && (
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                ${item.amount}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-300 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  Synthesizing real-time workspace metrics...
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about MRR, renewals, high-risk churn..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
