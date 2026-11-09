import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../components/layout/MainLayout';
import { Login } from '../pages/auth/Login';
import { Register, ForgotPassword } from '../pages/auth/Register';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { CustomerList } from '../pages/customers/CustomerList';
import { CustomerDetail } from '../pages/customers/CustomerDetail';
import { LeadPipeline } from '../pages/leads/LeadPipeline';
import { SubscriptionList } from '../pages/subscriptions/SubscriptionList';
import { PlanList } from '../pages/plans/PlanList';
import { PaymentList } from '../pages/payments/PaymentList';
import { InvoiceList } from '../pages/invoices/InvoiceList';
import { TaskList } from '../pages/tasks/TaskList';
import { AIInsightsCenter } from '../pages/ai/AIInsightsCenter';
import { Reports } from '../pages/analytics/Reports';
import { Settings } from '../pages/settings/Settings';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected SaaS Application Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="leads" element={<LeadPipeline />} />
        <Route path="subscriptions" element={<SubscriptionList />} />
        <Route path="plans" element={<PlanList />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="tasks" element={<TaskList />} />
        <Route path="ai-insights" element={<AIInsightsCenter />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/team" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
