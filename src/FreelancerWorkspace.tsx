import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  DollarSign,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Package,
  Search,
  Star,
  Trash2,
  UserCog,
} from 'lucide-react';
import { apiRequest, formatDateShort, formatMoney } from '../lib/api';
import type {
  Category,
  ExperienceItem,
  FreelancerProfile,
  Job,
  JobApplication,
  PaymentRecord,
  Project,
  ReviewItem,
  ServicePackage,
  TransactionRecord,
  UserSummary,
} from '../types/marketplace';
import {
  FloatingInput,
  FloatingSelect,
  FloatingTextarea,
} from './FloatingFields';
import { MessagesPanel } from './MessagesPanel';
import { RevenueChart } from './RevenueChart';

type FreelancerSection =
  | 'overview'
  | 'browse_jobs'
  | 'applications'
  | 'projects'
  | 'services'
  | 'profile'
  | 'earnings'
  | 'messages'
  | 'reviews';

interface FreelancerWorkspaceProps {
  user: UserSummary;
  categories: Category[];
  jobs: Job[];
  currencySymbol: string;
  initialMessagePartnerId?: number | null;
  onViewProfile: (userId: number) => void;
  onDataChanged: () => void;
  onRefreshCounts: () => void;
}

interface FreelancerOverviewResponse {
  profile: FreelancerProfile;
  applications: JobApplication[];
  services: ServicePackage[];
  projects: Project[];
  payments: PaymentRecord[];
  transactions: TransactionRecord[];
  reviews: ReviewItem[];
  metrics: {
    activeApplications: number;
    activeProjects: number;
    totalEarned: number;
    availableBalance: number;
  };
}

export const FreelancerWorkspace: React.FC<FreelancerWorkspaceProps> = ({
  user,
  categories,
  jobs,
  currencySymbol,
  initialMessagePartnerId = null,
  onViewProfile,
  onDataChanged,
  onRefreshCounts,
}) => {
  const [section, setSection] = useState<FreelancerSection>('overview');
  const [data, setData] = useState<FreelancerOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [messagePartnerId, setMessagePartnerId] = useState<number | null>(initialMessagePartnerId);

  // Browse Jobs filter & apply modal
  const [jobSearch, setJobSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState('900');
  const [deliveryDays, setDeliveryDays] = useState('14');
  const [coverLetter, setCoverLetter] = useState('');

  // Project progress modal
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [progressVal, setProgressVal] = useState('50');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [readyReview, setReadyReview] = useState(false);

  // Publish Service form
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCat, setSrvCat] = useState(String(categories[0]?.id || 1));
  const [srvPrice, setSrvPrice] = useState('450');
  const [srvDays, setSrvDays] = useState('7');
  const [srvRevisions, setSrvRevisions] = useState('3');
  const [srvFeatures, setSrvFeatures] = useState('Source files, Responsive UI, Documentation');
  const [srvDesc, setSrvDesc] = useState('');

  // Profile Editor state
  const [profName, setProfName] = useState(user.name);
  const [profLocation, setProfLocation] = useState(user.location || 'Dhaka, Bangladesh');
  const [profHeadline, setProfHeadline] = useState('');
  const [profBio, setProfBio] = useState('');
  const [profRate, setProfRate] = useState('35');
  const [profPortfolio, setProfPortfolio] = useState('');
  const [profAvail, setProfAvail] = useState('available');
  const [profSkills, setProfSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [profExp, setProfExp] = useState<ExperienceItem[]>([]);
  const [expRole, setExpRole] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expPeriod, setExpPeriod] = useState('');
  const [expSummary, setExpSummary] = useState('');

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawMethod, setWithdrawMethod] = useState('bKash Merchant / Personal');

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 5000);
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<FreelancerOverviewResponse>('/api/freelancer/overview');
      setData(res);
      if (res.profile) {
        setProfName(res.profile.name);
        setProfLocation(res.profile.location);
        setProfHeadline(res.profile.headline);
        setProfBio(res.profile.bio);
        setProfRate(String(res.profile.hourlyRate));
        setProfPortfolio(res.profile.portfolioUrl);
        setProfAvail(res.profile.availability);
        setProfSkills(res.profile.skills || []);
        setProfExp(res.profile.experience || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (initialMessagePartnerId) {
      setMessagePartnerId(initialMessagePartnerId);
      setSection('messages');
    }
  }, [initialMessagePartnerId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;
    try {
      await apiRequest(`/api/jobs/${applyingJob.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          bidAmount: Number(bidAmount),
          deliveryDays: Number(deliveryDays),
          coverLetter,
        }),
      });
      setApplyingJob(null);
      setCoverLetter('');
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Proposal submitted to client.');
      setSection('applications');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Unable to submit proposal.');
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      await apiRequest(`/api/projects/${editingProject.id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          progress: Number(progressVal),
          deliverableNotes,
          deliverableUrl,
          readyForReview: readyReview,
        }),
      });
      setEditingProject(null);
      await loadOverview();
      showMsg('ok', 'Project milestone updated.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: srvTitle,
          categoryId: Number(srvCat),
          price: Number(srvPrice),
          deliveryDays: Number(srvDays),
          revisions: Number(srvRevisions),
          features: srvFeatures,
          description: srvDesc,
        }),
      });
      setSrvTitle('');
      setSrvDesc('');
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Service package published.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Failed to publish service.');
    }
  };

  const handleToggleService = async (srv: ServicePackage) => {
    const next = srv.status === 'active' ? 'paused' : 'active';
    await apiRequest(`/api/services/${srv.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });
    await loadOverview();
    onDataChanged();
  };

  const handleDeleteService = async (id: number) => {
    await apiRequest(`/api/services/${id}`, { method: 'DELETE' });
    await loadOverview();
    onDataChanged();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/freelancer/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: profName,
          location: profLocation,
          headline: profHeadline,
          bio: profBio,
          hourlyRate: Number(profRate),
          portfolioUrl: profPortfolio,
          availability: profAvail,
          skills: profSkills,
          experience: profExp,
        }),
      });
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Freelancer profile, skills, and experience saved.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Failed to save profile.');
    }
  };

  const addSkill = () => {
    const cleaned = newSkill.trim();
    if (!cleaned || profSkills.includes(cleaned)) return;
    setProfSkills((prev) => [...prev, cleaned]);
    setNewSkill('');
  };

  const addExperience = () => {
    if (!expRole.trim() || !expCompany.trim()) return;
    setProfExp((prev) => [
      {
        id: `exp-${Date.now()}`,
        role: expRole.trim(),
        company: expCompany.trim(),
        period: expPeriod.trim() || '2024 — Present',
        summary: expSummary.trim(),
      },
      ...prev,
    ]);
    setExpRole('');
    setExpCompany('');
    setExpPeriod('');
    setExpSummary('');
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/freelancer/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          method: withdrawMethod,
        }),
      });
      await loadOverview();
      showMsg('ok', 'Payout withdrawal processed.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Withdrawal failed.');
    }
  };

  const openJobs = jobs.filter((j) => {
    if (j.status !== 'open') return false;
    if (catFilter !== 'all' && j.categoryId !== Number(catFilter)) return false;
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const navItems: Array<{ id: FreelancerSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'browse_jobs', label: 'Browse Jobs', icon: Search },
    { id: 'applications', label: 'My Proposals', icon: FileText },
    { id: 'projects', label: 'Projects & Orders', icon: FolderKanban },
    { id: 'services', label: 'Publish Services', icon: Package },
    { id: 'profile', label: 'Profile & Skills', icon: UserCog },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  const earningsChart = {
    labels: (data?.payments || []).slice(0, 6).reverse().map((p) => formatDateShort(p.createdAt)),
    values: (data?.payments || []).slice(0, 6).reverse().map((p) => p.netAmount),
    label: 'Net Freelancer Earnings',
  };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="liquid-glass sticky top-24 rounded-2xl p-4">
          <div className="mb-4 border-b border-white/10 px-2 pb-4">
            <p className="text-xs font-medium text-sky-300">Freelancer Studio</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-slate-100">{user.name}</h2>
            <p className="text-xs text-slate-400">
              {data?.profile?.headline || user.location}
            </p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
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
            {section === 'overview' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Active Proposals', value: String(data.metrics.activeApplications) },
                    { label: 'Active Projects', value: String(data.metrics.activeProjects) },
                    { label: 'Total Net Earned', value: formatMoney(data.metrics.totalEarned, currencySymbol) },
                    {
                      label: 'Available Balance',
                      value: formatMoney(data.metrics.availableBalance, currencySymbol),
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

                <RevenueChart
                  series={{
                    daily: { labels: [], gross: [], commission: [] },
                    weekly: { labels: [], gross: [], commission: [] },
                    monthly: { labels: [], gross: [], commission: [] },
                    yearly: { labels: [], gross: [], commission: [] },
                  }}
                  currencySymbol={currencySymbol}
                  simpleData={earningsChart}
                />

                <div className="liquid-glass rounded-2xl p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-100">Recommended Open Jobs</h3>
                    <button
                      type="button"
                      onClick={() => setSection('browse_jobs')}
                      className="text-xs font-medium text-sky-300 hover:text-sky-200"
                    >
                      Browse all
                    </button>
                  </div>
                  <div className="divide-y divide-white/[0.07]">
                    {openJobs.slice(0, 4).map((job) => (
                      <div key={job.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{job.title}</p>
                          <p className="text-xs text-slate-400">
                            {job.clientCompany} · {job.categoryName} · Due {job.deadline}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-sky-300 tabular-nums">
                            {formatMoney(job.budgetMin, currencySymbol)}–{formatMoney(job.budgetMax, currencySymbol)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setApplyingJob(job);
                              setBidAmount(String(job.budgetMin));
                            }}
                            className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'browse_jobs' && (
              <div className="space-y-4">
                <div className="liquid-glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
                  <div className="min-w-[220px] flex-1">
                    <FloatingInput
                      label="Search jobs or skills"
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-56">
                    <FloatingSelect
                      label="Category"
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Categories' },
                        ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                      ]}
                    />
                  </div>
                </div>

                <div className="liquid-glass divide-y divide-white/10 rounded-2xl px-6">
                  {openJobs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No open jobs match your search.</p>
                  ) : (
                    openJobs.map((job) => {
                      const applied = data.applications.some((a) => a.jobId === job.id);
                      return (
                        <div key={job.id} className="space-y-3 py-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h4 className="text-base font-semibold text-slate-100">{job.title}</h4>
                              <p className="mt-1 text-xs text-slate-400">
                                {job.clientCompany} · {job.categoryName} · {job.experienceLevel} · Due {job.deadline}
                              </p>
                            </div>
                            <span className="font-mono text-base font-bold text-sky-300 tabular-nums">
                              {formatMoney(job.budgetMin, currencySymbol)}–{formatMoney(job.budgetMax, currencySymbol)}
                              {job.jobType === 'hourly' ? '/hr' : ''}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-slate-300">{job.description}</p>
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <p className="text-xs text-slate-400">{job.skills.join(' · ')}</p>
                            {applied ? (
                              <span className="text-xs font-medium text-emerald-300">Proposal Submitted</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setApplyingJob(job);
                                  setBidAmount(String(job.budgetMin));
                                }}
                                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                              >
                                Submit Proposal
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {section === 'applications' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">
                  My Proposals ({data.applications.length})
                </h3>
                {data.applications.length === 0 ? (
                  <p className="text-sm text-slate-400">You have not applied to any jobs yet.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {data.applications.map((app) => (
                      <div key={app.id} className="space-y-2 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-100">{app.jobTitle}</h4>
                          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                            <span className="text-sky-300">{formatMoney(app.bidAmount, currencySymbol)}</span>
                            <span className="text-slate-400">{app.deliveryDays}d</span>
                            <span className="capitalize text-slate-200">{app.status}</span>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-400">{app.coverLetter}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'projects' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">
                  Assigned Projects & Orders ({data.projects.length})
                </h3>
                {data.projects.length === 0 ? (
                  <p className="text-sm text-slate-400">No active contracts yet.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {data.projects.map((p) => (
                      <div key={p.id} className="space-y-3 py-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-mono text-xs text-sky-300">{p.orderCode}</p>
                            <h4 className="text-base font-semibold text-slate-100">{p.title}</h4>
                            <p className="mt-1 text-xs text-slate-400">
                              Client: {p.clientName} · Due {p.dueDate} · Status:{' '}
                              <span className="capitalize text-slate-200">{p.status.replace('_', ' ')}</span> ·
                              Payment: <span className="capitalize text-sky-300">{p.paymentStatus}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                              {formatMoney(p.agreedAmount, currencySymbol)}
                            </p>
                            <p className="font-mono text-xs text-slate-400 tabular-nums">{p.progress}%</p>
                          </div>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-sky-400 transition-all"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {p.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProject(p);
                                setProgressVal(String(p.progress));
                                setDeliverableNotes(p.deliverableNotes);
                                setDeliverableUrl(p.deliverableUrl);
                                setReadyReview(p.status === 'in_review');
                              }}
                              className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                            >
                              Update Milestone / Submit Deliverable
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMessagePartnerId(p.clientId);
                              setSection('messages');
                            }}
                            className="rounded-xl border border-white/15 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/10"
                          >
                            Message Client
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'services' && (
              <div className="space-y-6">
                <form onSubmit={handleCreateService} className="liquid-glass space-y-4 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100">Publish a Service Package</h3>
                  <FloatingInput
                    label="Service Package Title"
                    value={srvTitle}
                    onChange={(e) => setSrvTitle(e.target.value)}
                    required
                  />
                  <div className="grid gap-4 sm:grid-cols-4">
                    <FloatingSelect
                      label="Category"
                      value={srvCat}
                      onChange={(e) => setSrvCat(e.target.value)}
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    />
                    <FloatingInput
                      label={`Price (${currencySymbol})`}
                      type="number"
                      min="10"
                      value={srvPrice}
                      onChange={(e) => setSrvPrice(e.target.value)}
                      required
                    />
                    <FloatingInput
                      label="Delivery Days"
                      type="number"
                      min="1"
                      value={srvDays}
                      onChange={(e) => setSrvDays(e.target.value)}
                      required
                    />
                    <FloatingInput
                      label="Revisions"
                      type="number"
                      min="1"
                      value={srvRevisions}
                      onChange={(e) => setSrvRevisions(e.target.value)}
                      required
                    />
                  </div>
                  <FloatingInput
                    label="Included Features (comma-separated)"
                    value={srvFeatures}
                    onChange={(e) => setSrvFeatures(e.target.value)}
                  />
                  <FloatingTextarea
                    label="Package Description"
                    rows={3}
                    value={srvDesc}
                    onChange={(e) => setSrvDesc(e.target.value)}
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Publish Service
                    </button>
                  </div>
                </form>

                <div className="liquid-glass rounded-2xl p-6">
                  <h3 className="mb-4 text-base font-semibold text-slate-100">
                    Your Published Services ({data.services.length})
                  </h3>
                  <div className="divide-y divide-white/10">
                    {data.services.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-100">{s.title}</h4>
                          <p className="text-xs text-slate-400">
                            {s.categoryName} · {s.deliveryDays}d · {s.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="mr-2 font-mono text-sm font-semibold text-sky-300 tabular-nums">
                            {formatMoney(s.price, currencySymbol)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleService(s)}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                          >
                            {s.status === 'active' ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(s.id)}
                            className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/15"
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

            {section === 'profile' && (
              <form onSubmit={handleSaveProfile} className="liquid-glass space-y-6 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">Profile, Skills & Experience</h3>
                    <p className="text-xs text-slate-400">Visible to clients browsing talent</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewProfile(user.id)}
                    className="rounded-xl border border-white/15 px-3.5 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Preview Public Profile
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput label="Display Name" value={profName} onChange={(e) => setProfName(e.target.value)} required />
                  <FloatingInput label="Location" value={profLocation} onChange={(e) => setProfLocation(e.target.value)} required />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FloatingInput label="Professional Headline" value={profHeadline} onChange={(e) => setProfHeadline(e.target.value)} required />
                  </div>
                  <FloatingInput label={`Hourly Rate (${currencySymbol})`} type="number" min="5" value={profRate} onChange={(e) => setProfRate(e.target.value)} required />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput label="Portfolio URL" value={profPortfolio} onChange={(e) => setProfPortfolio(e.target.value)} />
                  <FloatingSelect
                    label="Availability"
                    value={profAvail}
                    onChange={(e) => setProfAvail(e.target.value)}
                    options={[
                      { value: 'available', label: 'Available for New Contracts' },
                      { value: 'busy', label: 'Limited Capacity' },
                      { value: 'unavailable', label: 'Unavailable' },
                    ]}
                  />
                </div>

                <FloatingTextarea label="Professional Bio" rows={3} value={profBio} onChange={(e) => setProfBio(e.target.value)} />

                {/* Skills editor */}
                <div className="space-y-3 border-t border-white/10 pt-5">
                  <h4 className="text-sm font-semibold text-slate-200">Skills</h4>
                  <div className="flex gap-2">
                    <FloatingInput label="Add a skill (e.g. Docker)" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="shrink-0 rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 text-xs font-semibold text-sky-200 hover:bg-sky-500/25"
                    >
                      Add Skill
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profSkills.map((sk) => (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => setProfSkills((prev) => prev.filter((item) => item !== sk))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200 hover:border-rose-400/40 hover:text-rose-200"
                      >
                        {sk} ×
                      </button>
                    ))}
                  </div>
                </div>

                {/* Experience editor */}
                <div className="space-y-3 border-t border-white/10 pt-5">
                  <h4 className="text-sm font-semibold text-slate-200">Work Experience</h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FloatingInput label="Role Title" value={expRole} onChange={(e) => setExpRole(e.target.value)} />
                    <FloatingInput label="Company" value={expCompany} onChange={(e) => setExpCompany(e.target.value)} />
                    <FloatingInput label="Period (e.g. 2023 — Present)" value={expPeriod} onChange={(e) => setExpPeriod(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <FloatingInput label="Summary of impact" value={expSummary} onChange={(e) => setExpSummary(e.target.value)} />
                    <button
                      type="button"
                      onClick={addExperience}
                      className="shrink-0 rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 text-xs font-semibold text-sky-200 hover:bg-sky-500/25"
                    >
                      Add Role
                    </button>
                  </div>
                  <div className="divide-y divide-white/10">
                    {profExp.map((exp) => (
                      <div key={exp.id} className="flex items-start justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-100">
                            {exp.role} — {exp.company} ({exp.period})
                          </p>
                          <p className="text-xs text-slate-400">{exp.summary}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfExp((prev) => prev.filter((i) => i.id !== exp.id))}
                          aria-label="Remove experience"
                          className="p-1.5 text-slate-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            )}

            {section === 'earnings' && (
              <div className="space-y-6">
                <form onSubmit={handleWithdraw} className="liquid-glass grid items-end gap-4 rounded-2xl p-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400">Available Cleared Balance</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-sky-300 tabular-nums">
                      {formatMoney(data.metrics.availableBalance, currencySymbol)}
                    </p>
                  </div>
                  <FloatingInput
                    label={`Withdraw Amount (${currencySymbol})`}
                    type="number"
                    min="10"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <FloatingSelect
                      label="Payout Channel"
                      value={withdrawMethod}
                      onChange={(e) => setWithdrawMethod(e.target.value)}
                      options={[
                        { value: 'bKash Merchant / Personal', label: 'bKash' },
                        { value: 'Nagad Wallet', label: 'Nagad' },
                        { value: 'Dutch-Bangla Bank (BEFTN)', label: 'Bank (BEFTN)' },
                      ]}
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl bg-sky-500 px-4 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Withdraw
                    </button>
                  </div>
                </form>

                <div className="liquid-glass rounded-2xl p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-100">Earnings & Payout Ledger</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-white/10 text-xs text-slate-400">
                        <tr>
                          <th className="py-3 pr-4 font-medium">Type</th>
                          <th className="py-3 pr-4 font-medium">Description</th>
                          <th className="py-3 pr-4 font-medium">Date</th>
                          <th className="py-3 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {data.transactions.map((t) => (
                          <tr key={t.id} className="liquid-row">
                            <td className="py-3 pr-4 text-xs capitalize text-slate-300">
                              {t.type.replace('_', ' ')}
                            </td>
                            <td className="py-3 pr-4 text-slate-200">{t.description}</td>
                            <td className="py-3 pr-4 font-mono text-xs text-slate-400 tabular-nums">
                              {formatDateShort(t.createdAt)}
                            </td>
                            <td
                              className={`py-3 text-right font-mono font-semibold tabular-nums ${
                                t.direction === 'credit' ? 'text-emerald-300' : 'text-amber-300'
                              }`}
                            >
                              {t.direction === 'credit' ? '+' : '-'}
                              {formatMoney(t.amount, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {section === 'messages' && (
              <MessagesPanel
                currentUser={user}
                initialPartnerId={messagePartnerId}
                onMessagesRead={onRefreshCounts}
              />
            )}

            {section === 'reviews' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">
                  Client Reviews ({data.reviews.length})
                </h3>
                {data.reviews.length === 0 ? (
                  <p className="text-sm text-slate-400">No client reviews yet.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {data.reviews.map((r) => (
                      <div key={r.id} className="py-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-100">
                            {r.clientName} · {r.projectTitle}
                          </span>
                          <span className="font-mono text-amber-300 tabular-nums">
                            {r.rating}.0 / 5 · {formatDateShort(r.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-slate-300">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Apply to Job Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <form
            onSubmit={handleApply}
            className="liquid-glass-elevated w-full max-w-lg space-y-4 rounded-3xl p-6 sm:p-7"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">Submit Job Proposal</h3>
              <p className="mt-1 text-xs text-slate-400">{applyingJob.title}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingInput
                label={`Your Bid (${currencySymbol})`}
                type="number"
                min="10"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                required
              />
              <FloatingInput
                label="Delivery Days"
                type="number"
                min="1"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                required
              />
            </div>
            <FloatingTextarea
              label="Cover Letter & Implementation Plan"
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApplyingJob(null)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                Send Proposal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Update Project Progress Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <form
            onSubmit={handleUpdateProgress}
            className="liquid-glass-elevated w-full max-w-lg space-y-4 rounded-3xl p-6 sm:p-7"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">Update Project Progress</h3>
              <p className="mt-1 text-xs text-slate-400">
                {editingProject.orderCode} · {editingProject.title}
              </p>
            </div>
            <FloatingInput
              label="Completion Progress (%)"
              type="number"
              min="0"
              max="100"
              value={progressVal}
              onChange={(e) => setProgressVal(e.target.value)}
              required
            />
            <FloatingInput
              label="Deliverable Repository or Figma URL"
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
            />
            <FloatingTextarea
              label="Milestone Notes"
              rows={3}
              value={deliverableNotes}
              onChange={(e) => setDeliverableNotes(e.target.value)}
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={readyReview}
                onChange={(e) => setReadyReview(e.target.checked)}
                className="h-4 w-4 accent-sky-500"
              />
              Notify client that milestone is ready for review
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                Save Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
