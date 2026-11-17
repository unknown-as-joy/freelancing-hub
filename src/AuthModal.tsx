import React, { useState } from 'react';
import { KeyRound, Lock, Shield, UserCheck, UserPlus, X } from 'lucide-react';
import { apiRequest, setSessionToken } from '../lib/api';
import type { UserSummary } from '../types/marketplace';
import { FloatingInput, FloatingPasswordInput } from './FloatingFields';

export type AuthTab = 'login' | 'register_client' | 'register_freelancer' | 'admin_login' | 'forgot';

interface AuthModalProps {
  initialTab?: AuthTab;
  onClose: () => void;
  onSuccess: (user: UserSummary) => void;
}

const DEMO_ACCOUNTS = [
  { label: 'JOY (Admin)', identifier: 'joy', pass: 'Joy@2026!', role: 'admin' as const },
  { label: 'Bijoy (Client)', identifier: 'bijoy', pass: 'Demo@2026!', role: 'client' as const },
  { label: 'Sumit (Client)', identifier: 'sumit', pass: 'Demo@2026!', role: 'client' as const },
  { label: 'Rinki (Freelancer)', identifier: 'rinki', pass: 'Demo@2026!', role: 'freelancer' as const },
  { label: 'Jeet (Freelancer)', identifier: 'jeet', pass: 'Demo@2026!', role: 'freelancer' as const },
  { label: 'Deb (Freelancer)', identifier: 'deb', pass: 'Demo@2026!', role: 'freelancer' as const },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  initialTab = 'login',
  onClose,
  onSuccess,
}) => {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Registration state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('Dhaka, Bangladesh');
  const [headline, setHeadline] = useState('');
  const [hourlyRate, setHourlyRate] = useState('35');
  const [skills, setSkills] = useState('');

  // Reset password state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: UserSummary; sessionToken?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          password,
          rememberMe,
          expectedRole: tab === 'admin_login' ? 'admin' : undefined,
        }),
      });
      if (res.sessionToken) {
        setSessionToken(res.sessionToken, rememberMe);
      }
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const role = tab === 'register_client' ? 'client' : 'freelancer';
      const res = await apiRequest<{ user: UserSummary; sessionToken?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          username,
          email,
          password: regPassword,
          role,
          companyName,
          location,
          headline,
          hourlyRate: Number(hourlyRate),
          skills,
        }),
      });
      if (res.sessionToken) {
        setSessionToken(res.sessionToken, false);
      }
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string; resetToken: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: resetIdentifier }),
      });
      setGeneratedToken(res.resetToken);
      setTokenInput(res.resetToken);
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue reset token.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: tokenInput, newPassword }),
      });
      setNotice(res.message);
      setGeneratedToken('');
      setTab('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setError('');
    setNotice('');
    setTab(acc.role === 'admin' ? 'admin_login' : 'login');
    setIdentifier(acc.identifier);
    setPassword(acc.pass);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="liquid-glass-elevated relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute right-5 top-5 rounded-xl border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 pr-10">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-100">
            {tab === 'login' && 'Sign in to FREELANCING HUB'}
            {tab === 'admin_login' && 'Super Administrator Portal'}
            {tab === 'register_client' && 'Create a Client Account'}
            {tab === 'register_freelancer' && 'Join as a Freelancer'}
            {tab === 'forgot' && 'Reset Your Password'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {tab === 'admin_login'
              ? 'Restricted administrative access reserved exclusively for JOY.'
              : 'Secure session authentication with encrypted credentials.'}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {[
            { id: 'login' as AuthTab, label: 'Sign In', icon: Lock },
            { id: 'register_client' as AuthTab, label: 'Client Sign Up', icon: UserPlus },
            { id: 'register_freelancer' as AuthTab, label: 'Freelancer Sign Up', icon: UserCheck },
            { id: 'admin_login' as AuthTab, label: 'Admin (JOY)', icon: Shield },
            { id: 'forgot' as AuthTab, label: 'Reset', icon: KeyRound },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setError('');
                  setNotice('');
                }}
                className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === item.id
                    ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            {notice}
          </div>
        )}

        {(tab === 'login' || tab === 'admin_login') && (
          <form onSubmit={handleLogin} className="space-y-4">
            <FloatingInput
              label={tab === 'admin_login' ? 'Admin Username (joy)' : 'Username or Email'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
            <FloatingPasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-500"
                />
                Remember me for 30 days
              </label>
              <button
                type="button"
                onClick={() => setTab('forgot')}
                className="text-sky-300 hover:text-sky-200"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50"
            >
              {loading
                ? 'Verifying Credentials...'
                : tab === 'admin_login'
                  ? 'Sign In as Super Administrator'
                  : 'Sign In'}
            </button>
          </form>
        )}

        {(tab === 'register_client' || tab === 'register_freelancer') && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingInput
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <FloatingInput
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FloatingInput
                label="City / Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            {tab === 'register_client' ? (
              <FloatingInput
                label="Company or Organization Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FloatingInput
                      label="Professional Headline"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      required
                    />
                  </div>
                  <FloatingInput
                    label="Hourly Rate ($)"
                    type="number"
                    min="5"
                    max="500"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    required
                  />
                </div>
                <FloatingInput
                  label="Core Skills (comma-separated, e.g. React, MySQL, Figma)"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  required
                />
              </>
            )}

            <FloatingPasswordInput
              label="Create Password (min 6 characters)"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50"
            >
              {loading
                ? 'Creating Account...'
                : tab === 'register_client'
                  ? 'Create Client Account'
                  : 'Create Freelancer Account'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <div className="space-y-5">
            <form onSubmit={handleRequestReset} className="space-y-4">
              <FloatingInput
                label="Enter Username or Email"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/25"
              >
                Generate Reset Code
              </button>
            </form>

            {generatedToken && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                Verification Token:{' '}
                <span className="font-mono font-semibold text-sky-300">{generatedToken}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReset} className="space-y-4 border-t border-white/10 pt-5">
              <FloatingInput
                label="Reset Code"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                required
              />
              <FloatingPasswordInput
                label="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50"
              >
                Update Password
              </button>
            </form>
          </div>
        )}

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-2.5 text-xs font-medium text-slate-400">
            Quick Demo Access (Click to autofill credentials)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.identifier}
                type="button"
                onClick={() => fillDemo(acc)}
                className="truncate rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-2 text-left text-xs text-slate-300 transition-colors hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-200"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
