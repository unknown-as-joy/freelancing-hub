import React, { useCallback, useEffect, useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { AdminWorkspace } from './components/AdminWorkspace';
import { AuthModal, type AuthTab } from './components/AuthModal';
import { BrandLogo } from './components/BrandLogo';
import { ClientWorkspace } from './components/ClientWorkspace';
import { FreelancerWorkspace } from './components/FreelancerWorkspace';
import { MarketplaceHome } from './components/MarketplaceHome';
import { ProfileModal } from './components/ProfileModal';
import { apiRequest, formatDateShort, setCsrfToken, setSessionToken } from './lib/api';
import type {
  Category,
  FreelancerProfile,
  Job,
  NotificationItem,
  ServicePackage,
  UserSummary,
  WebsiteSettings,
} from './types/marketplace';

interface BootstrapPayload {
  csrfToken: string;
  user: UserSummary | null;
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
  unreadNotifications: number;
  unreadMessages: number;
}

export default function App() {
  const [boot, setBoot] = useState<BootstrapPayload | null>(null);
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [authModalTab, setAuthModalTab] = useState<AuthTab | null>(null);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [messagePartnerId, setMessagePartnerId] = useState<number | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadBootstrap = useCallback(async () => {
    const res = await apiRequest<BootstrapPayload>('/api/bootstrap');
    setCsrfToken(res.csrfToken);
    setBoot(res);
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const loadNotifications = async () => {
    if (!boot?.user) return;
    const res = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications');
    setNotifications(res.notifications);
  };

  const handleAuthSuccess = async (user: UserSummary) => {
    setAuthModalTab(null);
    await loadBootstrap();
    setView('workspace');
    if (user) {
      loadNotifications();
    }
  };

  const handleLogout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    setSessionToken(null);
    setNotifOpen(false);
    setView('home');
    await loadBootstrap();
  };

  const handleMarkAllRead = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
    await loadNotifications();
    await loadBootstrap();
  };

  const handleOrderServiceFromProfile = async (srv: ServicePackage) => {
    if (!boot?.user) {
      setProfileUserId(null);
      setAuthModalTab('login');
      return;
    }
    await apiRequest(`/api/services/${srv.id}/order`, {
      method: 'POST',
      body: JSON.stringify({ notes: `Booked "${srv.title}" package from profile.` }),
    });
    setProfileUserId(null);
    setView('workspace');
    await loadBootstrap();
  };

  if (!boot) {
    return (
      <div className="liquid-canvas flex min-h-screen items-center justify-center">
        <div className="liquid-glass rounded-2xl px-6 py-4 text-sm text-slate-300">
          Loading FREELANCING HUB...
        </div>
      </div>
    );
  }

  const { user, settings } = boot;

  return (
    <div className="liquid-canvas min-h-screen text-slate-100">
      {settings.maintenanceMode && (
        <div className="border-b border-amber-400/25 bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-200">
          Platform maintenance notice is active. Contact {settings.supportEmail} for urgent support.
        </div>
      )}

      {/* Floating Liquid Glass Top Navigation */}
      <div className="sticky top-0 z-40 px-4 pt-3 sm:px-6">
        <header className="liquid-nav mx-auto flex max-w-[1360px] items-center justify-between gap-8 rounded-2xl px-5 py-3.5">
          {/* Zone 1: Single text element Brand wordmark */}
          <button
            type="button"
            onClick={() => setView('home')}
            className="whitespace-nowrap shrink-0"
          >
            <BrandLogo size="sm" siteName={settings.siteName} />
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          {view === 'home' ? (
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
              <a href="#categories" className="whitespace-nowrap shrink-0 transition-colors hover:text-white">
                Categories
              </a>
              <a href="#freelancers" className="whitespace-nowrap shrink-0 transition-colors hover:text-white">
                Freelancers
              </a>
              <a href="#services" className="whitespace-nowrap shrink-0 transition-colors hover:text-white">
                Services
              </a>
            </nav>
          ) : (
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
              <button
                type="button"
                onClick={() => setView('home')}
                className="whitespace-nowrap shrink-0 transition-colors hover:text-white"
              >
                Marketplace Home
              </button>
              <button
                type="button"
                onClick={() => setView('workspace')}
                className="whitespace-nowrap shrink-0 text-sky-300 transition-colors hover:text-sky-200"
              >
                {user?.role === 'admin'
                  ? 'Admin Console'
                  : user?.role === 'client'
                    ? 'Client Dashboard'
                    : 'Freelancer Studio'}
              </button>
            </nav>
          )}

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Notifications"
                    onClick={async () => {
                      const next = !notifOpen;
                      setNotifOpen(next);
                      if (next) await loadNotifications();
                    }}
                    className="relative rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Bell className="h-4 w-4" />
                    {boot.unreadNotifications > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sky-500 px-1 font-mono text-[10px] font-bold text-slate-950">
                        {boot.unreadNotifications}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="liquid-glass-elevated absolute right-0 mt-3 w-80 rounded-2xl p-4 sm:w-96">
                      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
                        <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs text-sky-300 hover:text-sky-200"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-72 divide-y divide-white/[0.07] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="py-6 text-center text-xs text-slate-400">
                            No notifications yet.
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-100">{n.title}</p>
                                <span className="font-mono text-[10px] text-slate-500">
                                  {formatDateShort(n.createdAt)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-slate-400">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {view === 'home' ? (
                  <button
                    type="button"
                    onClick={() => setView('workspace')}
                    className="whitespace-nowrap shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                  >
                    Open Workspace
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalTab('login')}
                className="whitespace-nowrap shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
              >
                Sign In
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Main View */}
      {view === 'home' || !user ? (
        <MarketplaceHome
          settings={settings}
          categories={boot.categories}
          jobs={boot.jobs}
          freelancers={boot.freelancers}
          services={boot.services}
          stats={boot.stats}
          currentUser={user}
          onOpenAuth={(tab) => setAuthModalTab(tab)}
          onOpenWorkspace={() => setView('workspace')}
          onViewProfile={(id) => setProfileUserId(id)}
        />
      ) : user.role === 'admin' ? (
        <AdminWorkspace
          user={user}
          onViewProfile={(id) => setProfileUserId(id)}
          onDataChanged={loadBootstrap}
          onRefreshCounts={loadBootstrap}
        />
      ) : user.role === 'client' ? (
        <ClientWorkspace
          user={user}
          categories={boot.categories}
          freelancers={boot.freelancers}
          services={boot.services}
          currencySymbol={settings.currencySymbol}
          initialMessagePartnerId={messagePartnerId}
          onViewProfile={(id) => setProfileUserId(id)}
          onDataChanged={loadBootstrap}
          onRefreshCounts={loadBootstrap}
        />
      ) : (
        <FreelancerWorkspace
          user={user}
          categories={boot.categories}
          jobs={boot.jobs}
          currencySymbol={settings.currencySymbol}
          initialMessagePartnerId={messagePartnerId}
          onViewProfile={(id) => setProfileUserId(id)}
          onDataChanged={loadBootstrap}
          onRefreshCounts={loadBootstrap}
        />
      )}

      {/* Auth Modal */}
      {authModalTab && (
        <AuthModal
          initialTab={authModalTab}
          onClose={() => setAuthModalTab(null)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Public Profile Modal */}
      {profileUserId !== null && (
        <ProfileModal
          userId={profileUserId}
          currentUser={user}
          currencySymbol={settings.currencySymbol}
          onClose={() => setProfileUserId(null)}
          onOrderService={handleOrderServiceFromProfile}
          onMessageUser={(partnerId) => {
            setMessagePartnerId(partnerId);
            setView('workspace');
          }}
        />
      )}
    </div>
  );
}
