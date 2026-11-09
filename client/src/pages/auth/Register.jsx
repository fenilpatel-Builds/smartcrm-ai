import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !organizationName) {
      toast.error('All fields are required.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await register({ name, email, organizationName, password });
      toast.success('Organization workspace initialized! Welcome.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 items-center justify-center text-white font-black text-2xl shadow-lg shadow-teal-500/25 mb-4">
          S
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Create SmartCRM Workspace
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Get started with multi-tenant SaaS CRM & automated retention
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. David Miller"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Company / Workspace Name"
              type="text"
              placeholder="e.g. Acme SaaS Innovations"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />

            <Input
              label="Work Email"
              type="email"
              placeholder="david@acmesaas.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password (min 6 chars)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
              Create Account & Workspace
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-500">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reset your password</h2>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          Enter your email to receive recovery instructions
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-sm font-semibold text-teal-600">Password reset instructions dispatched!</p>
              <p className="text-xs text-slate-500 mt-2">Check your inbox for further directions.</p>
              <Link to="/login" className="mt-6 inline-block text-xs font-bold text-teal-600 hover:underline">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" className="w-full">
                Send Reset Link
              </Button>
              <div className="text-center mt-4">
                <Link to="/login" className="text-xs text-slate-500 hover:text-teal-600">
                  Cancel and return to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
