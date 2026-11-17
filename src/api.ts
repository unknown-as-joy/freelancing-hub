function readCookie(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const SESSION_KEY = 'fh_session_token';
let cachedCsrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  cachedCsrfToken = token;
}

export function setSessionToken(token: string | null, rememberMe = true): void {
  try {
    if (!token) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, token);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, token);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage may be restricted in private frames
  }
}

export function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const bearer = getSessionToken();
  if (bearer && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${bearer}`);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = cachedCsrfToken || readCookie('fh_csrf');
    if (csrf) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatMoney(amount: number, symbol = '$'): string {
  return `${symbol}${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
