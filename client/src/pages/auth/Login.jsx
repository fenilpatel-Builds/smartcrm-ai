import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Sparkles, Shield, UserCheck, Briefcase, Users } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back to SmartCRM!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 items-center justify-center text-white font-black text-2xl shadow-lg shadow-teal-500/25 mb-4">
          S
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          SmartCRM Platform
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          AI-Powered Customer Relationship & Subscription Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10">
          {searchParams.get('expired') && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-medium">
              Your session has expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-600 dark:text-slate-400">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 mr-2" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-teal-600 hover:text-teal-500 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Sign In to Workspace
            </Button>
          </form>

          {/* Demo Login Quick Fills */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              ⚡ Quick Demo Logins (Password: Password123!)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('owner@acmesaas.io')}
                className="flex items-center gap-2 p-2 rounded-xl text-left border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition"
              >
                <Briefcase className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <p className="text-slate-800 dark:text-slate-200">Org Owner</p>
                  <p className="text-[10px] text-slate-400 truncate">owner@acmesaas.io</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('manager@acmesaas.io')}
                className="flex items-center gap-2 p-2 rounded-xl text-left border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-slate-800 dark:text-slate-200">Sales Manager</p>
                  <p className="text-[10px] text-slate-400 truncate">manager@acmesaas.io</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('employee@acmesaas.io')}
                className="flex items-center gap-2 p-2 rounded-xl text-left border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition"
              >
                <Users className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <p className="text-slate-800 dark:text-slate-200">Success Rep</p>
                  <p className="text-[10px] text-slate-400 truncate">employee@acmesaas.io</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('admin@smartcrm.io')}
                className="flex items-center gap-2 p-2 rounded-xl text-left border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition"
              >
                <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-slate-800 dark:text-slate-200">Super Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">admin@smartcrm.io</p>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            Don't have a workspace yet?{' '}
            <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-500">
              Create an organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
