import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'hero';
  siteName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'hero',
  siteName = 'FREELANCING HUB',
}) => {
  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <svg
          width="26"
          height="26"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <defs>
            <linearGradient id="fh-grad-sm" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#fh-grad-sm)" fillOpacity="0.16" stroke="url(#fh-grad-sm)" strokeWidth="2" />
          <path d="M15 15H33M15 24H28M15 15V33" stroke="#E0F2FE" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M33 21V33" stroke="#38BDF8" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
        <span className="font-display text-base font-extrabold tracking-tight text-slate-50 sm:text-lg">
          {siteName}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      <div className="liquid-glass relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 via-white/[0.04] to-indigo-500/20 shadow-[0_18px_48px_-14px_rgba(56,189,248,0.45)] sm:h-28 sm:w-28">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="FREELANCING HUB Logo"
        >
          <defs>
            <linearGradient id="fh-hero-stroke" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="55%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>
          <rect
            x="6"
            y="6"
            width="52"
            height="52"
            rx="16"
            fill="rgba(56, 189, 248, 0.08)"
            stroke="url(#fh-hero-stroke)"
            strokeWidth="2.4"
          />
          <path
            d="M20 21H42M20 32H35M20 21V44"
            stroke="#F8FAFC"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M44 27V44M35 35.5H44"
            stroke="#38BDF8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="space-y-1.5">
        <h1
          className="font-display font-extrabold tracking-tight text-slate-50"
          style={{
            fontSize: 'clamp(2.2rem, 4.2vw, 3.6rem)',
            lineHeight: 1.04,
            textWrap: 'balance',
          }}
        >
          {siteName}
        </h1>
        <p className="text-sm font-medium text-sky-300/90">
          Direct Client &amp; Freelancer Marketplace · Administered by { 'JOY' }
        </p>
      </div>
    </div>
  );
};
