import React, { useEffect, useState } from 'react';
import { Briefcase, ExternalLink, MapPin, ShieldCheck, Star, X } from 'lucide-react';
import { apiRequest, formatDateShort, formatMoney, getInitials } from '../lib/api';
import type {
  FreelancerProfile,
  Job,
  ReviewItem,
  ServicePackage,
  UserSummary,
} from '../types/marketplace';

interface ProfileModalProps {
  userId: number;
  currentUser: UserSummary | null;
  currencySymbol: string;
  onClose: () => void;
  onOrderService?: (service: ServicePackage) => void;
  onMessageUser?: (userId: number) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  userId,
  currentUser,
  currencySymbol,
  onClose,
  onOrderService,
  onMessageUser,
}) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [freelancer, setFreelancer] = useState<FreelancerProfile | null>(null);
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{
      user: UserSummary;
      freelancer: FreelancerProfile | null;
      services?: ServicePackage[];
      jobs?: Job[];
      reviews: ReviewItem[];
    }>(`/api/users/${userId}/profile`)
      .then((res) => {
        if (!active) return;
        setUser(res.user);
        setFreelancer(res.freelancer);
        setServices(res.services || []);
        setJobs(res.jobs || []);
        setReviews(res.reviews || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="liquid-glass-elevated relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="absolute right-5 top-5 rounded-xl border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        {loading ? (
          <div className="space-y-4 py-8">
            <div className="h-14 w-64 animate-pulse rounded-xl bg-white/5" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-white/5" />
          </div>
        ) : !user ? (
          <p className="py-8 text-sm text-slate-400">Profile unavailable.</p>
        ) : (
          <div className="space-y-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6 pr-10">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 font-display text-xl font-bold text-white"
                  style={{ backgroundColor: `${user.avatarColor}28` }}
                >
                  {getInitials(user.name)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-bold text-slate-100">{user.name}</h2>
                    {freelancer?.verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified Specialist
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-300">
                    {freelancer ? freelancer.headline : user.companyName || 'Verified Client'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {user.location || 'Dhaka, Bangladesh'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{user.role}</span>
                    {freelancer && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {formatMoney(freelancer.hourlyRate, currencySymbol)}/hr
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-300">
                          <Star className="h-3.5 w-3.5 fill-amber-300" />
                          {freelancer.rating.toFixed(1)} ({freelancer.reviewCount})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {freelancer?.portfolioUrl && (
                  <a
                    href={freelancer.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
                  >
                    Portfolio <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {currentUser && currentUser.id !== user.id && onMessageUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onMessageUser(user.id);
                    }}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                  >
                    Send Message
                  </button>
                )}
              </div>
            </div>

            {freelancer && (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-200">About</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{freelancer.bio}</p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-200">Skills</h3>
                  <p className="text-sm text-slate-300">
                    {freelancer.skills.join('  ·  ')}
                  </p>
                </div>

                {freelancer.experience.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-200">Experience</h3>
                    <div className="divide-y divide-white/10 border-t border-b border-white/10">
                      {freelancer.experience.map((exp) => (
                        <div key={exp.id} className="py-3.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-medium text-slate-100">
                              {exp.role} — <span className="text-slate-300">{exp.company}</span>
                            </p>
                            <span className="font-mono text-xs text-slate-400">{exp.period}</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">{exp.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {services.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-200">Published Service Packages</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {services.map((srv) => (
                        <div key={srv.id} className="liquid-glass rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-100">{srv.title}</h4>
                            <span className="font-mono text-sm font-semibold text-sky-300 tabular-nums">
                              {formatMoney(srv.price, currencySymbol)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-400">{srv.description}</p>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                            <span className="font-mono tabular-nums">
                              {srv.deliveryDays}d delivery · {srv.revisions} revisions
                            </span>
                            {currentUser?.role === 'client' && onOrderService && (
                              <button
                                type="button"
                                onClick={() => onOrderService(srv)}
                                className="rounded-lg bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/30"
                              >
                                Order Package
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {jobs.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-200">Posted Jobs</h3>
                <div className="divide-y divide-white/10 border-t border-b border-white/10">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{job.title}</p>
                        <p className="text-xs text-slate-400">
                          {job.categoryName} · {job.status}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-sky-300 tabular-nums">
                        {formatMoney(job.budgetMin, currencySymbol)}–{formatMoney(job.budgetMax, currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-200">
                Client Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400">No reviews recorded yet.</p>
              ) : (
                <div className="divide-y divide-white/10 border-t border-b border-white/10">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="py-3.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-200">
                          {rev.clientName} · <span className="text-slate-400">{rev.projectTitle}</span>
                        </span>
                        <span className="font-mono text-amber-300 tabular-nums">
                          {rev.rating}.0 / 5 · {formatDateShort(rev.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-300">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
