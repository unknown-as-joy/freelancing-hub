import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Code2,
  Compass,
  Layers,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { formatMoney, getInitials } from '../lib/api';
import type {
  Category,
  FreelancerProfile,
  Job,
  ServicePackage,
  UserSummary,
  WebsiteSettings,
} from '../types/marketplace';
import type { AuthTab } from './AuthModal';
import { BrandLogo } from './BrandLogo';

interface MarketplaceHomeProps {
  settings: WebsiteSettings;
  categories: Category[];
  jobs: Job[];
  freelancers: FreelancerProfile[];
  services: ServicePackage[];
  stats: {
    openJobs: number;
    verifiedFreelancers: number;
    completedProjects: number;
    totalVolume: number;
  };
  currentUser: UserSummary | null;
  onOpenAuth: (tab: AuthTab) => void;
  onOpenWorkspace: () => void;
  onViewProfile: (userId: number) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  Layers,
  BarChart3,
  ShieldCheck,
  Compass,
  Briefcase,
};

export const MarketplaceHome: React.FC<MarketplaceHomeProps> = ({
  settings,
  categories,
  jobs,
  freelancers,
  services,
  stats,
  currentUser,
  onOpenAuth,
  onOpenWorkspace,
  onViewProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');

  const q = searchQuery.trim().toLowerCase();
  const filteredFreelancers = freelancers.filter((f) => {
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      f.headline.toLowerCase().includes(q) ||
      f.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const filteredServices = services.filter((srv) => {
    if (selectedCategory !== 'all' && srv.categoryId !== selectedCategory) return false;
    if (!q) return true;
    return (
      srv.title.toLowerCase().includes(q) ||
      srv.description.toLowerCase().includes(q) ||
      srv.categoryName.toLowerCase().includes(q)
    );
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    document.getElementById('freelancers')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="mx-auto max-w-[1280px] px-4 pt-12 sm:px-6 lg:pt-16">
        <div className="liquid-glass relative overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-14">
          <div className="grid items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-between space-y-8 lg:col-span-7">
              <div className="space-y-4">
                <BrandLogo size="hero" siteName={settings.siteName} />
              </div>

              <div className="space-y-5">
                <form
                  onSubmit={handleHeroSearch}
                  className="flex flex-col gap-2.5 rounded-2xl border border-white/12 bg-white/[0.03] p-2 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-1 items-center gap-2.5 px-3">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search talent or services by skill (e.g. React, Figma, MySQL)..."
                      className="w-full bg-transparent py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="whitespace-nowrap shrink-0 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                  >
                    Search Talent
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-3">
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={onOpenWorkspace}
                      className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      Open {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'client' ? 'Client' : 'Freelancer'} Workspace
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenAuth('register_client')}
                        className="whitespace-nowrap shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10"
                      >
                        Register as Client
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAuth('register_freelancer')}
                        className="whitespace-nowrap shrink-0 rounded-xl border border-sky-400/35 bg-sky-500/12 px-5 py-2.5 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
                      >
                        Register as Freelancer
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAuth('login')}
                        className="whitespace-nowrap shrink-0 px-3 py-2.5 text-sm font-medium text-slate-300 underline decoration-white/25 underline-offset-4 hover:text-white"
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Liquid Glass Highlight Panel */}
            <div className="animate-float-slow flex flex-col justify-between rounded-2xl border border-white/12 bg-gradient-to-br from-sky-500/[0.08] via-white/[0.03] to-indigo-500/[0.07] p-6 lg:col-span-5">
              <div>
                <p className="text-xs font-medium text-sky-300">Active Marketplace Snapshot</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-100">
                  Direct Contracts & Milestone Escrow
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {settings.announcementText}
                </p>
              </div>

              <div className="my-6 divide-y divide-white/10 border-t border-b border-white/10">
                {jobs.slice(0, 3).map((j) => (
                  <div key={j.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{j.title}</p>
                      <p className="truncate text-xs text-slate-400">
                        {j.clientCompany} · {j.categoryName}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-sky-300 tabular-nums">
                      {formatMoney(j.budgetMax, settings.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Platform fee: {settings.commissionPercent}%</span>
                <button
                  type="button"
                  onClick={() =>
                    currentUser ? onOpenWorkspace() : onOpenAuth('admin_login')
                  }
                  className="font-medium text-slate-200 hover:text-sky-300"
                >
                  {currentUser ? 'Go to Dashboard' : 'Admin Portal (JOY)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4-column KPI strip below hero */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Open Project Briefs', value: String(stats.openJobs), note: 'Accepting proposals' },
            { label: 'Vetted Specialists', value: String(stats.verifiedFreelancers), note: 'Dhaka, Chattogram & Sylhet' },
            { label: 'Completed Contracts', value: String(stats.completedProjects), note: 'Verified client reviews' },
            {
              label: 'Settled Escrow Volume',
              value: formatMoney(stats.totalVolume, settings.currencySymbol),
              note: 'Protected milestone payouts',
            },
          ].map((item) => (
            <div key={item.label} className="liquid-glass rounded-2xl px-6 py-5">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-slate-100 tabular-nums">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Categories */}
      <section id="categories" className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              Popular Categories
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Select a specialization to filter open marketplace briefs.
            </p>
          </div>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-medium text-sky-300 hover:text-sky-200"
            >
              Show all categories
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] || Briefcase;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(active ? 'all' : cat.id);
                  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`liquid-glass group rounded-2xl p-6 text-left transition-all duration-150 ${
                  active ? 'border-sky-400/45 bg-sky-500/[0.08]' : 'hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-sky-300" />
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {cat.jobCount || 0} open
                  </span>
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-slate-100 group-hover:text-sky-200">
                  {cat.name}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{cat.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Freelancers */}
      <section id="freelancers" className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              Featured Freelancers
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Senior Bangladeshi engineering, design, and infrastructure specialists.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {filteredFreelancers.slice(0, 6).map((f) => (
            <div key={f.userId} className="liquid-glass flex flex-col justify-between rounded-2xl p-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 font-display text-sm font-bold text-white"
                      style={{ backgroundColor: `${f.avatarColor}2e` }}
                    >
                      {getInitials(f.name)}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => onViewProfile(f.userId)}
                        className="text-left font-display text-base font-semibold text-slate-100 hover:text-sky-300"
                      >
                        {f.name}
                      </button>
                      <p className="text-xs text-slate-400">{f.location}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-sky-300 tabular-nums">
                    {formatMoney(f.hourlyRate, settings.currencySymbol)}/hr
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-slate-200">{f.headline}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">{f.bio}</p>
                <p className="mt-3 text-xs text-slate-300">{f.skills.slice(0, 4).join(' · ')}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                <span className="inline-flex items-center gap-1 font-mono text-amber-300 tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-amber-300" />
                  {f.rating.toFixed(1)} · {f.completedProjects} projects
                </span>
                <button
                  type="button"
                  onClick={() => onViewProfile(f.userId)}
                  className="font-medium text-sky-300 hover:text-sky-200"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Published Services */}
      <section id="services" className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Fixed-Scope Service Packages
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Book transparent deliverables directly with guaranteed turnaround timelines.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {filteredServices.slice(0, 6).map((srv) => (
            <div key={srv.id} className="liquid-glass flex flex-col justify-between rounded-2xl p-6">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{srv.categoryName}</span>
                  <span className="font-mono tabular-nums">{srv.deliveryDays} days delivery</span>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-100">{srv.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{srv.description}</p>
                <ul className="mt-4 space-y-1 text-xs text-slate-300">
                  {srv.features.slice(0, 3).map((feat) => (
                    <li key={feat}>· {feat}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-slate-400">By {srv.freelancerName}</p>
                  <p className="font-mono text-base font-bold text-sky-300 tabular-nums">
                    {formatMoney(srv.price, settings.currencySymbol)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    currentUser ? onOpenWorkspace() : onOpenAuth('register_client')
                  }
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-100 hover:bg-white/10"
                >
                  Book Package
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1280px] border-t border-white/10 px-4 pt-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-base font-bold tracking-tight text-slate-100">
              {settings.siteName}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Owned & Administered by {settings.ownerName} · {settings.supportEmail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <a href="#categories" className="hover:text-slate-200">
              Categories
            </a>
            <a href="#freelancers" className="hover:text-slate-200">
              Talent Directory
            </a>
            <a href="#services" className="hover:text-slate-200">
              Services
            </a>
            <button
              type="button"
              onClick={() => onOpenAuth('admin_login')}
              className="hover:text-sky-300"
            >
              Admin Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
