import React, { useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  CreditCard,
  FolderKanban,
  Grid,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Star,
  UserCheck,
  Users,
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { apiRequest, formatDateShort, formatMoney } from '../lib/api';
import type {
  Category,
  FreelancerProfile,
  Job,
  PaymentRecord,
  Project,
  RevenueSeries,
  ReviewItem,
  TransactionRecord,
  UserSummary,
  WebsiteSettings,
} from '../types/marketplace';
import { FloatingInput, FloatingTextarea } from './FloatingFields';
import { MessagesPanel } from './MessagesPanel';
import { RevenueChart } from './RevenueChart';

type AdminSection =
  | 'dashboard'
  | 'users'
  | 'clients'
  | 'freelancers'
  | 'jobs'
  | 'projects'
  | 'payments'
  | 'transactions'
  | 'reviews'
  | 'categories'
  | 'settings'
  | 'messages';

interface AdminWorkspaceProps {
  user: UserSummary;
  onViewProfile: (userId: number) => void;
  onDataChanged: () => void;
  onRefreshCounts: () => void;
}

interface AdminOverviewResponse {
  users: UserSummary[];
  freelancers: FreelancerProfile[];
  jobs: Job[];
  projects: Project[];
  payments: PaymentRecord[];
  transactions: TransactionRecord[];
  reviews: ReviewItem[];
  categories: Category[];
  settings: WebsiteSettings;
  revenue: RevenueSeries;
  metrics: {
    totalUsers: number;
    totalClients: number;
    totalFreelancers: number;
    openJobs: number;
    activeProjects: number;
    grossRevenue: number;
    netCommission: number;
  };
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  user,
  onViewProfile,
  onDataChanged,
  onRefreshCounts,
}) => {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Category creation state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Website Settings state
  const [siteName, setSiteName] = useState('FREELANCING HUB');
  const [tagline, setTagline] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('10');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [announcementText, setAnnouncementText] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 5000);
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<AdminOverviewResponse>('/api/admin/overview');
      setData(res);
      setSiteName(res.settings.siteName);
      setTagline(res.settings.tagline);
      setSupportEmail(res.settings.supportEmail);
      setCommissionPercent(String(res.settings.commissionPercent));
      setCurrencySymbol(res.settings.currencySymbol);
      setAnnouncementText(res.settings.announcementText);
      setMaintenanceMode(res.settings.maintenanceMode);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleToggleUserStatus = async (u: UserSummary) => {
    try {
      await apiRequest(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: u.status === 'active' ? 'suspended' : 'active' }),
      });
      await loadOverview();
      onDataChanged();
      showMsg('ok', `${u.name} status updated.`);
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const handleToggleVerify = async (f: FreelancerProfile) => {
    try {
      await apiRequest(`/api/admin/users/${f.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: !f.verified }),
      });
      await loadOverview();
      onDataChanged();
      showMsg('ok', `${f.name} verification status updated.`);
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const handleDeleteUser = async (u: UserSummary) => {
    try {
      await apiRequest(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      await loadOverview();
      onDataChanged();
      showMsg('ok', `Removed user ${u.name}.`);
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Cannot delete user.');
    }
  };

  const handleToggleJobFeatured = async (job: Job) => {
    await apiRequest(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ featured: !job.featured }),
    });
    await loadOverview();
    onDataChanged();
  };

  const handleJobStatus = async (jobId: number, status: string) => {
    await apiRequest(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadOverview();
    onDataChanged();
  };

  const handleDeleteJob = async (jobId: number) => {
    await apiRequest(`/api/jobs/${jobId}`, { method: 'DELETE' });
    await loadOverview();
    onDataChanged();
  };

  const handleProjectStatus = async (id: number, status: string) => {
    await apiRequest(`/api/admin/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadOverview();
  };

  const handlePaymentStatus = async (id: number, status: string) => {
    await apiRequest(`/api/admin/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadOverview();
  };

  const handleDeleteReview = async (id: number) => {
    await apiRequest(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    await loadOverview();
    onDataChanged();
    showMsg('ok', 'Review removed and rating recalculated.');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      setCatName('');
      setCatDesc('');
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Category created.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Failed to create category.');
    }
  };

  const handleToggleCategory = async (c: Category) => {
    await apiRequest(`/api/admin/categories/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    await loadOverview();
    onDataChanged();
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' });
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Category deleted.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Cannot delete category.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          siteName,
          tagline,
          supportEmail,
          commissionPercent: Number(commissionPercent),
          currencySymbol,
          maintenanceMode,
          announcementText,
        }),
      });
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Platform settings saved and live across FREELANCING HUB.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  const navItems: Array<{ id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Analytics Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'clients', label: 'Manage Clients', icon: Briefcase },
    { id: 'freelancers', label: 'Manage Freelancers', icon: UserCheck },
    { id: 'jobs', label: 'Manage Jobs', icon: Shield },
    { id: 'projects', label: 'Manage Projects', icon: FolderKanban },
    { id: 'payments', label: 'Manage Payments', icon: CreditCard },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'reviews', label: 'Manage Reviews', icon: Star },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'settings', label: 'Website Settings', icon: Settings },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  const currency = data?.settings.currencySymbol || '$';

  const categoryChartData = data
    ? {
        labels: data.categories.map((c) => c.name),
        datasets: [
          {
            data: data.categories.map((c) => Math.max(1, c.jobCount || 0)),
            backgroundColor: ['#38bdf8', '#818cf8', '#14b8a6', '#0ea5e9', '#6366f1', '#22d3ee'],
            borderColor: '#070b17',
            borderWidth: 2,
          },
        ],
      }
    : null;

  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="liquid-glass sticky top-24 rounded-2xl p-4">
          <div className="mb-4 border-b border-white/10 px-2 pb-4">
            <p className="text-xs font-medium text-sky-300">Super Administrator</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-slate-100">{user.name}</h2>
            <p className="text-xs text-slate-400">@{user.username} · Platform Owner</p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-xl px-3.5 py-2 text-left text-sm font-medium transition-colors ${
                    section === item.id
                      ? 'bg-sky-500/18 text-sky-200 border border-sky-400/30'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="space-y-6 lg:col-span-9">
        {feedback && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === 'ok'
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/35 bg-rose-500/10 text-rose-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {loading || !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="liquid-glass h-28 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {section === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Gross Platform Volume', value: formatMoney(data.metrics.grossRevenue, currency) },
                    { label: 'Net Commission Revenue', value: formatMoney(data.metrics.netCommission, currency) },
                    {
                      label: 'Registered Accounts',
                      value: `${data.metrics.totalUsers} (${data.metrics.totalClients}C / ${data.metrics.totalFreelancers}F)`,
                    },
                    {
                      label: 'Open Jobs / Active Orders',
                      value: `${data.metrics.openJobs} / ${data.metrics.activeProjects}`,
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className="liquid-glass rounded-2xl p-5">
                      <p className="text-xs text-slate-400">{kpi.label}</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-slate-100 tabular-nums">
                        {kpi.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <RevenueChart series={data.revenue} currencySymbol={currency} mode="admin" />
                  </div>
                  <div className="liquid-glass flex flex-col justify-between rounded-2xl p-6 lg:col-span-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">Category Demand</h3>
                      <p className="text-xs text-slate-400">Open jobs across marketplace verticals</p>
                    </div>
                    {categoryChartData && (
                      <div className="my-4 h-56">
                        <Doughnut
                          data={categoryChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { color: '#cbd5e1', boxWidth: 10, font: { size: 11 } },
                              },
                            },
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {section === 'users' && (
              <div className="liquid-glass rounded-2xl p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-100">All Platform Users ({data.users.length})</h3>
                  <div className="w-full sm:w-64">
                    <FloatingInput
                      label="Filter by name or role"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs text-slate-400">
                      <tr>
                        <th className="py-3 pr-4 font-medium">User</th>
                        <th className="py-3 pr-4 font-medium">Username</th>
                        <th className="py-3 pr-4 font-medium">Role</th>
                        <th className="py-3 pr-4 font-medium">Location</th>
                        <th className="py-3 pr-4 font-medium">Status</th>
                        <th className="py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {data.users
                        .filter((u) => {
                          const q = userSearch.toLowerCase();
                          return !q || u.name.toLowerCase().includes(q) || u.role.includes(q) || u.username.includes(q);
                        })
                        .map((u) => (
                          <tr key={u.id} className="liquid-row">
                            <td className="py-3 pr-4">
                              <button
                                type="button"
                                onClick={() => onViewProfile(u.id)}
                                className="font-medium text-slate-100 hover:text-sky-300"
                              >
                                {u.name}
                              </button>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </td>
                            <td className="py-3 pr-4 font-mono text-xs text-slate-300">@{u.username}</td>
                            <td className="py-3 pr-4 text-xs capitalize text-sky-300">
                              {u.username === 'joy' ? 'Super Admin' : u.role}
                            </td>
                            <td className="py-3 pr-4 text-xs text-slate-400">{u.location}</td>
                            <td className="py-3 pr-4 text-xs capitalize">
                              <span className={u.status === 'active' ? 'text-emerald-300' : 'text-rose-300'}>
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {u.username === 'joy' ? (
                                <span className="text-xs text-slate-500">Protected Owner</span>
                              ) : (
                                <div className="inline-flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u)}
                                    className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
                                  >
                                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/15"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'clients' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Client Directory</h3>
                <div className="divide-y divide-white/10">
                  {data.users
                    .filter((u) => u.role === 'client')
                    .map((c) => {
                      const posted = data.jobs.filter((j) => j.clientId === c.id).length;
                      const spent = data.payments
                        .filter((p) => p.clientId === c.id)
                        .reduce((s, p) => s + p.grossAmount, 0);
                      return (
                        <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                          <div>
                            <button
                              type="button"
                              onClick={() => onViewProfile(c.id)}
                              className="text-base font-semibold text-slate-100 hover:text-sky-300"
                            >
                              {c.name}
                            </button>
                            <p className="text-xs text-slate-400">
                              {c.companyName || 'Independent'} · {c.email} · {c.location}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="font-mono text-slate-300 tabular-nums">{posted} jobs</span>
                            <span className="font-mono font-semibold text-sky-300 tabular-nums">
                              {formatMoney(spent, currency)} spent
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(c)}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/10"
                            >
                              {c.status === 'active' ? 'Suspend' : 'Restore'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {section === 'freelancers' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Freelancer Directory</h3>
                <div className="divide-y divide-white/10">
                  {data.freelancers.map((f) => (
                    <div key={f.userId} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => onViewProfile(f.userId)}
                          className="text-base font-semibold text-slate-100 hover:text-sky-300"
                        >
                          {f.name}
                        </button>
                        <p className="text-xs text-slate-400">
                          {f.headline} · {f.location} ·{' '}
                          <span className="font-mono tabular-nums">{formatMoney(f.hourlyRate, currency)}/hr</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-amber-300 tabular-nums">
                          {f.rating.toFixed(1)} rating
                        </span>
                        <span className="font-mono text-emerald-300 tabular-nums">
                          {formatMoney(f.totalEarned, currency)} earned
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleVerify(f)}
                          className={`rounded-lg border px-3 py-1.5 font-medium ${
                            f.verified
                              ? 'border-sky-400/35 bg-sky-500/15 text-sky-200'
                              : 'border-white/15 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {f.verified ? 'Verified' : 'Verify Talent'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'jobs' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">All Marketplace Jobs ({data.jobs.length})</h3>
                <div className="divide-y divide-white/10">
                  {data.jobs.map((job) => (
                    <div key={job.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">{job.title}</h4>
                        <p className="text-xs text-slate-400">
                          {job.clientCompany} · {job.categoryName} ·{' '}
                          <span className="font-mono tabular-nums">
                            {formatMoney(job.budgetMin, currency)}–{formatMoney(job.budgetMax, currency)}
                          </span>{' '}
                          · {job.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleJobFeatured(job)}
                          className={`rounded-lg border px-3 py-1.5 ${
                            job.featured
                              ? 'border-sky-400/40 bg-sky-500/20 text-sky-200'
                              : 'border-white/15 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {job.featured ? 'Featured' : 'Feature'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleJobStatus(job.id, job.status === 'open' ? 'closed' : 'open')}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/10"
                        >
                          {job.status === 'open' ? 'Close' : 'Reopen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id)}
                          className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-rose-300 hover:bg-rose-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'projects' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">All Platform Projects ({data.projects.length})</h3>
                <div className="divide-y divide-white/10">
                  {data.projects.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-mono text-xs text-sky-300">{p.orderCode}</p>
                        <h4 className="text-sm font-semibold text-slate-100">{p.title}</h4>
                        <p className="text-xs text-slate-400">
                          {p.clientName} → {p.freelancerName} · Progress{' '}
                          <span className="font-mono tabular-nums">{p.progress}%</span> · Payment {p.paymentStatus}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono font-semibold text-slate-200 tabular-nums">
                          {formatMoney(p.agreedAmount, currency)}
                        </span>
                        <select
                          value={p.status}
                          onChange={(e) => handleProjectStatus(p.id, e.target.value)}
                          className="rounded-lg border border-white/15 bg-[#0c1324] px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          <option value="active">Active</option>
                          <option value="in_review">In Review</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'payments' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Platform Payments ({data.payments.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs text-slate-400">
                      <tr>
                        <th className="py-3 pr-4 font-medium">Ref</th>
                        <th className="py-3 pr-4 font-medium">Parties</th>
                        <th className="py-3 pr-4 font-medium">Method</th>
                        <th className="py-3 pr-4 text-right font-medium">Gross</th>
                        <th className="py-3 pr-4 text-right font-medium">Fee</th>
                        <th className="py-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {data.payments.map((pay) => (
                        <tr key={pay.id} className="liquid-row">
                          <td className="py-3 pr-4 font-mono text-xs text-sky-300">{pay.referenceCode}</td>
                          <td className="py-3 pr-4 text-xs text-slate-200">
                            {pay.clientName} → {pay.freelancerName}
                            <p className="text-slate-400">{pay.projectTitle}</p>
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-400">{pay.paymentMethod}</td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-100">
                            {formatMoney(pay.grossAmount, currency)}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-sky-300">
                            {formatMoney(pay.platformFee, currency)}
                          </td>
                          <td className="py-3 text-right">
                            <select
                              value={pay.status}
                              onChange={(e) => handlePaymentStatus(pay.id, e.target.value)}
                              className="rounded-lg border border-white/15 bg-[#0c1324] px-2 py-1 text-xs text-slate-200"
                            >
                              <option value="completed">Completed</option>
                              <option value="pending">Pending</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'transactions' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Financial Transactions Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs text-slate-400">
                      <tr>
                        <th className="py-3 pr-4 font-medium">User</th>
                        <th className="py-3 pr-4 font-medium">Type</th>
                        <th className="py-3 pr-4 font-medium">Description</th>
                        <th className="py-3 pr-4 font-medium">Date</th>
                        <th className="py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {data.transactions.map((t) => (
                        <tr key={t.id} className="liquid-row">
                          <td className="py-3 pr-4 text-slate-200">{t.userName}</td>
                          <td className="py-3 pr-4 text-xs capitalize text-slate-400">
                            {t.type.replace('_', ' ')}
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-300">{t.description}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-slate-400 tabular-nums">
                            {formatDateShort(t.createdAt)}
                          </td>
                          <td
                            className={`py-3 text-right font-mono font-semibold tabular-nums ${
                              t.direction === 'credit' ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {t.direction === 'credit' ? '+' : '-'}
                            {formatMoney(t.amount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'reviews' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Moderation: Client Reviews ({data.reviews.length})</h3>
                <div className="divide-y divide-white/10">
                  {data.reviews.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                      <div>
                        <p className="text-xs text-slate-400">
                          <span className="font-medium text-slate-200">{r.clientName}</span> reviewed{' '}
                          <span className="font-medium text-sky-300">{r.freelancerName}</span> · {r.projectTitle} ·{' '}
                          <span className="font-mono text-amber-300">{r.rating}.0 / 5</span>
                        </p>
                        <p className="mt-1.5 text-sm text-slate-300">{r.comment}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(r.id)}
                        className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/15"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'categories' && (
              <div className="space-y-6">
                <form onSubmit={handleCreateCategory} className="liquid-glass space-y-4 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100">Add Marketplace Category</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FloatingInput label="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} required />
                    <FloatingInput label="Short Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Create Category
                    </button>
                  </div>
                </form>

                <div className="liquid-glass rounded-2xl p-6">
                  <h3 className="mb-4 text-base font-semibold text-slate-100">Active & Archived Categories</h3>
                  <div className="divide-y divide-white/10">
                    {data.categories.map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{c.name}</p>
                          <p className="text-xs text-slate-400">
                            {c.description} · {c.jobCount || 0} open jobs
                          </p>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(c)}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/10"
                          >
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id)}
                            className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-rose-300 hover:bg-rose-500/15"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'settings' && (
              <form onSubmit={handleSaveSettings} className="liquid-glass space-y-5 rounded-2xl p-6 sm:p-8">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-100">Website Settings</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Primary Owner: <span className="font-semibold text-sky-300">JOY</span> (Super Administrator)
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput label="Platform Name" value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
                  <FloatingInput label="Support Email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} required />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput
                    label="Platform Commission (%)"
                    type="number"
                    min="1"
                    max="30"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    required
                  />
                  <FloatingInput
                    label="Currency Symbol"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    required
                  />
                </div>

                <FloatingTextarea label="Homepage Tagline" rows={2} value={tagline} onChange={(e) => setTagline(e.target.value)} />
                <FloatingInput
                  label="Global Announcement Notice"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                />

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="h-4 w-4 accent-sky-500"
                  />
                  Enable Maintenance Banner Mode
                </label>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    Save Website Settings
                  </button>
                </div>
              </form>
            )}

            {section === 'messages' && (
              <MessagesPanel currentUser={user} onMessagesRead={onRefreshCounts} />
            )}
          </>
        )}
      </main>
    </div>
  );
};
