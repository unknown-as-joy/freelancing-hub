import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Star,
  Users,
} from 'lucide-react';
import { apiRequest, formatDateShort, formatMoney } from '../lib/api';
import type {
  Category,
  FreelancerProfile,
  Job,
  JobApplication,
  PaymentRecord,
  Project,
  ReviewItem,
  ServicePackage,
  UserSummary,
} from '../types/marketplace';
import {
  FloatingInput,
  FloatingSelect,
  FloatingTextarea,
} from './FloatingFields';
import { MessagesPanel } from './MessagesPanel';
import { RevenueChart } from './RevenueChart';

type ClientSection =
  | 'overview'
  | 'post_job'
  | 'jobs'
  | 'applications'
  | 'projects'
  | 'talent'
  | 'payments'
  | 'messages'
  | 'reviews';

interface ClientWorkspaceProps {
  user: UserSummary;
  categories: Category[];
  freelancers: FreelancerProfile[];
  services: ServicePackage[];
  currencySymbol: string;
  initialSection?: ClientSection;
  initialMessagePartnerId?: number | null;
  onViewProfile: (userId: number) => void;
  onDataChanged: () => void;
  onRefreshCounts: () => void;
}

interface ClientOverviewResponse {
  jobs: Job[];
  applications: JobApplication[];
  projects: Project[];
  payments: PaymentRecord[];
  reviews: ReviewItem[];
  metrics: {
    activeJobs: number;
    pendingApplications: number;
    activeProjects: number;
    totalSpent: number;
  };
}

export const ClientWorkspace: React.FC<ClientWorkspaceProps> = ({
  user,
  categories,
  freelancers,
  services,
  currencySymbol,
  initialSection = 'overview',
  initialMessagePartnerId = null,
  onViewProfile,
  onDataChanged,
  onRefreshCounts,
}) => {
  const [section, setSection] = useState<ClientSection>(initialSection);
  const [data, setData] = useState<ClientOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [messagePartnerId, setMessagePartnerId] = useState<number | null>(initialMessagePartnerId);

  // Post Job form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobCat, setJobCat] = useState(String(categories[0]?.id || 1));
  const [jobType, setJobType] = useState('fixed');
  const [jobLevel, setJobLevel] = useState('intermediate');
  const [budgetMin, setBudgetMin] = useState('600');
  const [budgetMax, setBudgetMax] = useState('1200');
  const [deadline, setDeadline] = useState('2026-12-28');
  const [skills, setSkills] = useState('React, TypeScript, MySQL');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment Checkout modal state
  const [payingProject, setPayingProject] = useState<Project | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Corporate Visa');

  // Review modal state
  const [reviewingProject, setReviewingProject] = useState<Project | null>(null);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ClientOverviewResponse>('/api/client/overview');
      setData(res);
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

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 5000);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: jobTitle,
          categoryId: Number(jobCat),
          jobType,
          experienceLevel: jobLevel,
          budgetMin: Number(budgetMin),
          budgetMax: Number(budgetMax),
          deadline,
          skills,
          description,
        }),
      });
      setJobTitle('');
      setDescription('');
      showMsg('ok', 'Job posted and published to the marketplace.');
      await loadOverview();
      onDataChanged();
      setSection('jobs');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Failed to post job.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJobStatus = async (jobId: number, status: string) => {
    try {
      await apiRequest(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Job status updated.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    try {
      await apiRequest(`/api/jobs/${jobId}`, { method: 'DELETE' });
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Job deleted.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleApplicationStatus = async (appId: number, status: 'shortlisted' | 'rejected') => {
    try {
      await apiRequest(`/api/applications/${appId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadOverview();
      showMsg('ok', `Application marked ${status}.`);
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Failed to update application.');
    }
  };

  const handleHire = async (appId: number) => {
    try {
      const res = await apiRequest<{ project: Project }>(`/api/applications/${appId}/hire`, {
        method: 'POST',
      });
      await loadOverview();
      onDataChanged();
      showMsg('ok', `Freelancer hired! Contract ${res.project.orderCode} created.`);
      setSection('projects');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Failed to hire freelancer.');
    }
  };

  const handleOrderService = async (srv: ServicePackage) => {
    try {
      const res = await apiRequest<{ project: Project }>(`/api/services/${srv.id}/order`, {
        method: 'POST',
        body: JSON.stringify({ notes: `Booked "${srv.title}" package.` }),
      });
      await loadOverview();
      onDataChanged();
      showMsg('ok', `Service ordered! Project ${res.project.orderCode} is now active.`);
      setSection('projects');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Unable to order service.');
    }
  };

  const handlePayProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingProject) return;
    try {
      const res = await apiRequest<{ referenceCode: string }>(`/api/projects/${payingProject.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      });
      setPayingProject(null);
      await loadOverview();
      onDataChanged();
      showMsg('ok', `Payment ${res.referenceCode} completed and settled.`);
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Payment failed.');
    }
  };

  const handleCompleteProject = async (projectId: number) => {
    try {
      await apiRequest(`/api/projects/${projectId}/complete`, { method: 'POST' });
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Project marked completed. You can now leave a verified review.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Could not complete project.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingProject) return;
    try {
      await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          projectId: reviewingProject.id,
          rating: Number(reviewRating),
          comment: reviewComment,
        }),
      });
      setReviewingProject(null);
      setReviewComment('');
      await loadOverview();
      onDataChanged();
      showMsg('ok', 'Review published to freelancer profile.');
    } catch (err) {
      showMsg('err', err instanceof Error ? err.message : 'Review failed.');
    }
  };

  const navItems: Array<{ id: ClientSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'post_job', label: 'Post a Job', icon: PlusCircle },
    { id: 'jobs', label: 'Manage Jobs', icon: Briefcase },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'projects', label: 'Projects & Orders', icon: FolderKanban },
    { id: 'talent', label: 'Hire Talent', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  const spendingChart = {
    labels: (data?.payments || []).slice(0, 6).reverse().map((p) => formatDateShort(p.createdAt)),
    values: (data?.payments || []).slice(0, 6).reverse().map((p) => p.grossAmount),
    label: 'Recent Project Payments',
  };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-12">
      {/* Floating Sidebar */}
      <aside className="lg:col-span-3">
        <div className="liquid-glass sticky top-24 rounded-2xl p-4">
          <div className="mb-4 border-b border-white/10 px-2 pb-4">
            <p className="text-xs font-medium text-sky-300">Client Workspace</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-slate-100">{user.name}</h2>
            <p className="text-xs text-slate-400">{user.companyName || user.location}</p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
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

      {/* Main Content */}
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
                    { label: 'Open Jobs', value: String(data.metrics.activeJobs) },
                    { label: 'Proposals Waiting', value: String(data.metrics.pendingApplications) },
                    { label: 'Active Projects', value: String(data.metrics.activeProjects) },
                    { label: 'Total Invested', value: formatMoney(data.metrics.totalSpent, currencySymbol) },
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
                  simpleData={spendingChart}
                />

                <div className="liquid-glass rounded-2xl p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-100">Active Contracts</h3>
                    <button
                      type="button"
                      onClick={() => setSection('projects')}
                      className="text-xs font-medium text-sky-300 hover:text-sky-200"
                    >
                      Manage all
                    </button>
                  </div>
                  {data.projects.length === 0 ? (
                    <p className="text-sm text-slate-400">No contracts started yet.</p>
                  ) : (
                    <div className="divide-y divide-white/[0.07]">
                      {data.projects.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-slate-100">{p.title}</p>
                            <p className="text-xs text-slate-400">
                              {p.orderCode} · Freelancer: {p.freelancerName} · Progress{' '}
                              <span className="font-mono tabular-nums">{p.progress}%</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-slate-200 tabular-nums">
                              {formatMoney(p.agreedAmount, currencySymbol)}
                            </span>
                            <span className="text-xs capitalize text-sky-300">{p.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === 'post_job' && (
              <form onSubmit={handlePostJob} className="liquid-glass space-y-5 rounded-2xl p-6 sm:p-8">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-100">Post a New Job</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Define deliverables, budget, and timeline to receive proposals from verified talent.
                  </p>
                </div>

                <FloatingInput
                  label="Job Title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <FloatingSelect
                    label="Category"
                    value={jobCat}
                    onChange={(e) => setJobCat(e.target.value)}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  />
                  <FloatingSelect
                    label="Engagement Type"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    options={[
                      { value: 'fixed', label: 'Fixed Price' },
                      { value: 'hourly', label: 'Hourly Rate' },
                    ]}
                  />
                  <FloatingSelect
                    label="Experience Level"
                    value={jobLevel}
                    onChange={(e) => setJobLevel(e.target.value)}
                    options={[
                      { value: 'entry', label: 'Entry' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'expert', label: 'Expert' },
                    ]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FloatingInput
                    label={`Min Budget (${currencySymbol})`}
                    type="number"
                    min="10"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    required
                  />
                  <FloatingInput
                    label={`Max Budget (${currencySymbol})`}
                    type="number"
                    min="10"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    required
                  />
                  <FloatingInput
                    label="Target Deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>

                <FloatingInput
                  label="Required Skills (comma-separated)"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />

                <FloatingTextarea
                  label="Project Scope & Deliverables"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50"
                  >
                    {submitting ? 'Publishing...' : 'Publish Job'}
                  </button>
                </div>
              </form>
            )}

            {section === 'jobs' && (
              <div className="liquid-glass rounded-2xl p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-100">Manage Your Jobs</h3>
                  <button
                    type="button"
                    onClick={() => setSection('post_job')}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                  >
                    New Job
                  </button>
                </div>

                {data.jobs.length === 0 ? (
                  <p className="py-6 text-sm text-slate-400">You have not posted any jobs yet.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {data.jobs.map((job) => (
                      <div key={job.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-100">{job.title}</h4>
                          <p className="mt-1 text-xs text-slate-400">
                            {job.categoryName} · {job.jobType === 'fixed' ? 'Fixed' : 'Hourly'} ·{' '}
                            <span className="font-mono tabular-nums text-slate-200">
                              {formatMoney(job.budgetMin, currencySymbol)}–{formatMoney(job.budgetMax, currencySymbol)}
                            </span>{' '}
                            · {job.applicationCount} proposals · Due {job.deadline}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="mr-2 text-xs capitalize text-sky-300">
                            {job.status.replace('_', ' ')}
                          </span>
                          {job.status === 'open' ? (
                            <button
                              type="button"
                              onClick={() => handleJobStatus(job.id, 'closed')}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                            >
                              Close
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJobStatus(job.id, 'open')}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                            >
                              Reopen
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id)}
                            className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/15"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'applications' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-5 text-lg font-semibold text-slate-100">
                  Incoming Freelancer Proposals ({data.applications.length})
                </h3>
                {data.applications.length === 0 ? (
                  <p className="py-6 text-sm text-slate-400">No applications received yet.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {data.applications.map((app) => (
                      <div key={app.id} className="space-y-3 py-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <button
                              type="button"
                              onClick={() => onViewProfile(app.freelancerId)}
                              className="text-left text-base font-semibold text-sky-300 hover:text-sky-200"
                            >
                              {app.freelancerName}
                            </button>
                            <p className="text-xs text-slate-400">
                              {app.freelancerHeadline} · Rating{' '}
                              <span className="font-mono text-amber-300 tabular-nums">
                                {app.freelancerRating.toFixed(1)}
                              </span>{' '}
                              · Applied to: <span className="text-slate-200">{app.jobTitle}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-base font-bold text-slate-100 tabular-nums">
                              {formatMoney(app.bidAmount, currencySymbol)}
                            </p>
                            <p className="font-mono text-xs text-slate-400 tabular-nums">
                              {app.deliveryDays} days delivery · {app.status}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm leading-relaxed text-slate-300">{app.coverLetter}</p>

                        {app.status !== 'hired' && app.status !== 'rejected' && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleHire(app.id)}
                              className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                            >
                              Hire Freelancer
                            </button>
                            {app.status !== 'shortlisted' && (
                              <button
                                type="button"
                                onClick={() => handleApplicationStatus(app.id, 'shortlisted')}
                                className="rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                              >
                                Shortlist
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleApplicationStatus(app.id, 'rejected')}
                              className="rounded-xl border border-rose-500/30 px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMessagePartnerId(app.freelancerId);
                                setSection('messages');
                              }}
                              className="rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
                            >
                              Message
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'projects' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-5 text-lg font-semibold text-slate-100">
                  Projects & Orders ({data.projects.length})
                </h3>
                {data.projects.length === 0 ? (
                  <p className="py-6 text-sm text-slate-400">No active or completed projects yet.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {data.projects.map((p) => {
                      const alreadyReviewed = data.reviews.some((r) => r.projectId === p.id);
                      return (
                        <div key={p.id} className="space-y-3 py-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="font-mono text-xs text-sky-300">{p.orderCode}</p>
                              <h4 className="mt-0.5 text-base font-semibold text-slate-100">{p.title}</h4>
                              <p className="mt-1 text-xs text-slate-400">
                                Freelancer:{' '}
                                <button
                                  type="button"
                                  onClick={() => onViewProfile(p.freelancerId)}
                                  className="text-slate-200 underline decoration-white/20 hover:text-sky-300"
                                >
                                  {p.freelancerName}
                                </button>{' '}
                                · Due {p.dueDate} · Status:{' '}
                                <span className="capitalize text-slate-200">{p.status.replace('_', ' ')}</span> ·
                                Payment: <span className="capitalize text-sky-300">{p.paymentStatus}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                                {formatMoney(p.agreedAmount, currencySymbol)}
                              </p>
                              <p className="font-mono text-xs text-slate-400 tabular-nums">
                                {p.progress}% complete
                              </p>
                            </div>
                          </div>

                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-sky-400 transition-all"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>

                          {p.deliverableNotes && (
                            <p className="text-xs text-slate-300">
                              Latest Deliverable: {p.deliverableNotes}{' '}
                              {p.deliverableUrl && (
                                <a
                                  href={p.deliverableUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-2 text-sky-300 underline"
                                >
                                  Inspect Link
                                </a>
                              )}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {p.paymentStatus === 'unpaid' && (
                              <button
                                type="button"
                                onClick={() => setPayingProject(p)}
                                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                              >
                                Pay & Release ({formatMoney(p.agreedAmount, currencySymbol)})
                              </button>
                            )}
                            {p.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleCompleteProject(p.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Mark Completed
                              </button>
                            )}
                            {p.status === 'completed' && !alreadyReviewed && (
                              <button
                                type="button"
                                onClick={() => setReviewingProject(p)}
                                className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-3.5 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
                              >
                                Write Review
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMessagePartnerId(p.freelancerId);
                                setSection('messages');
                              }}
                              className="rounded-xl border border-white/15 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/10"
                            >
                              Message Freelancer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {section === 'talent' && (
              <div className="space-y-6">
                <div className="liquid-glass rounded-2xl p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-100">Verified Bangladeshi Freelancers</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {freelancers.map((f) => (
                      <div key={f.userId} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <button
                              type="button"
                              onClick={() => onViewProfile(f.userId)}
                              className="text-base font-semibold text-slate-100 hover:text-sky-300"
                            >
                              {f.name}
                            </button>
                            <p className="mt-0.5 text-xs text-slate-400">{f.headline}</p>
                          </div>
                          <span className="font-mono text-sm font-semibold text-sky-300 tabular-nums">
                            {formatMoney(f.hourlyRate, currencySymbol)}/hr
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-300">{f.skills.slice(0, 5).join(' · ')}</p>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                          <span className="font-mono tabular-nums">
                            {f.rating.toFixed(1)} rating · {f.completedProjects} completed
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => onViewProfile(f.userId)}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/10"
                            >
                              Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMessagePartnerId(f.userId);
                                setSection('messages');
                              }}
                              className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-sky-200 hover:bg-sky-500/30"
                            >
                              Message
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="liquid-glass rounded-2xl p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-100">Ready-to-Book Service Packages</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {services.map((srv) => (
                      <div key={srv.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-100">{srv.title}</h4>
                          <span className="font-mono text-base font-bold text-sky-300 tabular-nums">
                            {formatMoney(srv.price, currencySymbol)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          By {srv.freelancerName} · {srv.deliveryDays} days delivery
                        </p>
                        <p className="mt-2.5 text-xs leading-relaxed text-slate-300">{srv.description}</p>
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOrderService(srv)}
                            className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                          >
                            Book Package
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'payments' && (
              <div className="liquid-glass rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Payment History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs text-slate-400">
                      <tr>
                        <th className="py-3 pr-4 font-medium">Reference</th>
                        <th className="py-3 pr-4 font-medium">Project</th>
                        <th className="py-3 pr-4 font-medium">Freelancer</th>
                        <th className="py-3 pr-4 font-medium">Method</th>
                        <th className="py-3 pr-4 font-medium">Date</th>
                        <th className="py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {data.payments.map((pay) => (
                        <tr key={pay.id} className="liquid-row">
                          <td className="py-3 pr-4 font-mono text-xs text-sky-300">{pay.referenceCode}</td>
                          <td className="py-3 pr-4 text-slate-200">{pay.projectTitle}</td>
                          <td className="py-3 pr-4 text-slate-300">{pay.freelancerName}</td>
                          <td className="py-3 pr-4 text-xs text-slate-400">{pay.paymentMethod}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-slate-400 tabular-nums">
                            {formatDateShort(pay.createdAt)}
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-slate-100 tabular-nums">
                            {formatMoney(pay.grossAmount, currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Reviews You Submitted</h3>
                {data.reviews.length === 0 ? (
                  <p className="text-sm text-slate-400">No reviews submitted yet.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {data.reviews.map((r) => (
                      <div key={r.id} className="py-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-100">
                            {r.freelancerName} · {r.projectTitle}
                          </span>
                          <span className="font-mono text-amber-300 tabular-nums">{r.rating}.0 / 5</span>
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

      {/* Escrow / Payment Checkout Modal */}
      {payingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <form
            onSubmit={handlePayProject}
            className="liquid-glass-elevated w-full max-w-md space-y-5 rounded-3xl p-6 sm:p-7"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">Confirm Project Payment</h3>
              <p className="mt-1 text-xs text-slate-400">
                {payingProject.orderCode} · {payingProject.title}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Contract Amount</span>
                <span className="font-mono text-lg font-bold text-sky-300 tabular-nums">
                  {formatMoney(payingProject.agreedAmount, currencySymbol)}
                </span>
              </div>
            </div>
            <FloatingSelect
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'Corporate Visa', label: 'Corporate Visa / Mastercard' },
                { value: 'SSLCommerz / Bank Card', label: 'SSLCommerz / Local Card' },
                { value: 'bKash Business', label: 'bKash Merchant Wallet' },
                { value: 'Bank Transfer (BEFTN)', label: 'Bank Transfer (BEFTN)' },
              ]}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayingProject(null)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                Pay Now
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Review Modal */}
      {reviewingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <form
            onSubmit={handleSubmitReview}
            className="liquid-glass-elevated w-full max-w-md space-y-4 rounded-3xl p-6 sm:p-7"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">Review Freelancer</h3>
              <p className="mt-1 text-xs text-slate-400">
                {reviewingProject.freelancerName} · {reviewingProject.title}
              </p>
            </div>
            <FloatingSelect
              label="Rating"
              value={reviewRating}
              onChange={(e) => setReviewRating(e.target.value)}
              options={[
                { value: '5', label: '5 Stars — Exceptional' },
                { value: '4', label: '4 Stars — Strong Delivery' },
                { value: '3', label: '3 Stars — Satisfactory' },
                { value: '2', label: '2 Stars — Needs Improvement' },
                { value: '1', label: '1 Star — Unsatisfactory' },
              ]}
            />
            <FloatingTextarea
              label="Share feedback on delivery quality & communication"
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingProject(null)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
