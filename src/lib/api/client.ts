/**
 * ============================================================================
 * KENNEDY MOON GRILL — HTTP CLIENT FOR THE DJANGO BACKEND
 * ============================================================================
 *
 * TOKEN REFRESH STRATEGY
 *   Access token lifetime  : 30 minutes (Django SIMPLE_JWT)
 *   Refresh token lifetime : 7 days
 *
 *   On any 401 (access token expired):
 *     1. Silently POST /auth/refresh/ with the stored refresh token.
 *     2. Save the new access token returned by Django.
 *     3. Retry the original request once with the fresh access token.
 *     4. If the refresh itself fails (refresh token expired/invalid):
 *        - Clear both tokens from localStorage.
 *        - Fire "kmg-auth-change" so useAccount() returns null and the
 *          router beforeLoad guard redirects to /login automatically.
 */

/**
 * Backend host root. Accepts the env var with or without a trailing `/api`
 * (and with or without a trailing slash) — the `/api` prefix is added per
 * request by `normalizePath()`, so both spellings resolve to the same URL and
 * never produce `/api/api/...`.
 */
export const API_BASE_URL: string = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? ""
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export const AUTH_MODE: "jwt" | "session" =
  (import.meta.env["VITE_API_AUTH_MODE"] as "jwt" | "session" | undefined) ?? "jwt";

/** True once the backend URL is configured. */
export const isBackendConfigured = () => API_BASE_URL.length > 0;

const ACCESS_KEY = "kmg.api.access";
const REFRESH_KEY = "kmg.api.refresh";

export const tokens = {
  access: () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY)),
  refresh: () => (typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY)),
  set(access: string, refresh?: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

function csrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith("csrftoken="));
  return hit ? decodeURIComponent(hit.slice("csrftoken=".length)) : null;
}

export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  /** True when the request never reached the server (offline, DNS, CORS, cold-start timeout). */
  isNetwork: boolean;
  constructor(
    status: number,
    message: string,
    fields: Record<string, string[]> = {},
    isNetwork = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.isNetwork = isNetwork;
  }
}

/**
 * Friendly copy for DRF field errors so users never read
 * `username: this field is required`.
 */
const FIELD_LABELS: Record<string, string> = {
  username: "Username",
  password: "Password",
  email: "Email",
  phone: "Phone number",
  full_name: "Full name",
  requested_role: "Account type",
  non_field_errors: "",
  detail: "",
};

export function friendlyFieldMessage(fields: Record<string, string[]>): string {
  return Object.entries(fields)
    .map(([key, values]) => {
      const label = FIELD_LABELS[key] ?? key.replace(/_/g, " ");
      const raw = values.join(" ");
      const text = /this field (is required|may not be blank)/i.test(raw)
        ? `is required`
        : /already exists/i.test(raw)
          ? `is already taken`
          : raw.replace(/^This field /i, "");
      return label ? `${label} ${text}`.replace(/\s+/g, " ").trim() : text;
    })
    .join(" ");
}

/** Cold-start hint: Railway free tier sleeps, so the first call can take 10-30s. */
export const API_SLOW_EVENT = "kmg-api-slow";
export const API_SLOW_DONE_EVENT = "kmg-api-slow-done";
const SLOW_AFTER_MS = 3500;

type Options = { query?: Record<string, string | number | boolean | undefined>; signal?: AbortSignal };


// ─── Silent refresh helpers ───────────────────────────────────────────────────

let _refreshPromise: Promise<string> | null = null;

/**
 * Canonicalise every request path to the Django URL conf.
 *
 * Django mounts the whole DRF surface under `/api/` (`/api/auth/login/`,
 * `/api/orders/`, `/api/admin/riders/`, ...) and DRF requires the trailing
 * slash. Frontend modules may spell paths either way (`/orders/` or
 * `/api/orders/`); this makes both hit the same URL:
 *   - ensure a leading slash
 *   - add the `/api` prefix exactly once (never `/api/api/...`)
 *   - keep the Django admin panel (`/admin/` HTML) out of the API prefix only
 *     when explicitly spelled `/django-admin/`
 *   - ensure the DRF trailing slash before any query string
 */
export function normalizePath(p: string): string {
  let np = p.startsWith("/") ? p : `/${p}`;

  // Escape hatch for non-API Django routes (admin panel, static, etc.)
  if (np.startsWith("/django-admin/")) return np.replace("/django-admin", "/admin");

  if (!/^\/api(\/|$)/.test(np)) np = `/api${np}`;

  // DRF: append the trailing slash (before ?query) to avoid APPEND_SLASH redirects
  const [pathname, query] = np.split("?");
  const withSlash = pathname!.endsWith("/") ? pathname! : `${pathname}/`;
  return query ? `${withSlash}?${query}` : withSlash;
}


async function refreshAccessToken(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    const refresh = tokens.refresh();
    if (!refresh) throw new ApiError(401, "no_refresh_token");
    const refreshPath = normalizePath("/auth/refresh/");
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${refreshPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // Server unreachable (offline / cold start) — NOT an invalid session.
      throw new ApiError(0, OFFLINE_MESSAGE, {}, true);
    }
    if (!res.ok) {
      // 5xx = backend hiccup, keep the session. 4xx = refresh token is dead.
      if (res.status >= 500) throw new ApiError(res.status, OFFLINE_MESSAGE, {}, true);
      throw new ApiError(res.status, "refresh_failed");
    }
    const data = (await res.json()) as { access: string; refresh?: string };
    tokens.set(data.access, data.refresh);
    return data.access;
  })().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

export const OFFLINE_MESSAGE =
  "We can't reach the kitchen server right now. Check your connection and try again — your session is still active.";

function forceSignOut() {
  tokens.clear();
  if (typeof localStorage !== "undefined") localStorage.removeItem("kmg.auth.v1");
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kmg-auth-change"));
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: Options = {},
  _isRetry = false,
): Promise<T> {
  if (!isBackendConfigured()) {
    // Fail loudly: a missing API base URL in production must never silently
    // degrade into fake local accounts.
    throw new ApiError(
      0,
      "This app is not connected to its server (VITE_API_BASE_URL is missing). Please contact support.",
    );
  }

  // Normalize path early so all logic below uses the canonical path and so
  // callers can pass either /auth/... or /api/auth/... without 404s.
  path = normalizePath(path);

  const url = new URL(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(options.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });

  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (AUTH_MODE === "jwt") {
    const access = tokens.access();
    if (access) headers["Authorization"] = `Bearer ${access}`;
  } else {
    const csrf = csrfToken();
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  // Cold-start UX: tell the UI when a request is taking suspiciously long so it
  // can show a "waking up the kitchen" state instead of looking frozen.
  const slowTimer =
    typeof window === "undefined"
      ? null
      : setTimeout(() => window.dispatchEvent(new Event(API_SLOW_EVENT)), SLOW_AFTER_MS);
  const clearSlow = () => {
    if (slowTimer) clearTimeout(slowTimer);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(API_SLOW_DONE_EVENT));
  };

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      credentials: AUTH_MODE === "session" ? "include" : "same-origin",
      ...(body === undefined ? {} : { body: isForm ? (body as FormData) : JSON.stringify(body) }),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (err) {
    clearSlow();
    if ((err as Error)?.name === "AbortError") throw err;
    // Never sign the user out for a transport failure.
    throw new ApiError(0, OFFLINE_MESSAGE, {}, true);
  }
  clearSlow();

  // ── Silent token refresh on 401 ─────────────────────────────────────────
  // Don't attempt a silent refresh for authentication endpoints themselves
  // (both /auth/... and /api/auth/...). Match either form.
  if (res.status === 401 && AUTH_MODE === "jwt" && !_isRetry && !/^\/(api\/)?auth(\/|$)/.test(path)) {
    if (tokens.refresh()) {
      try {
        await refreshAccessToken();
        return request<T>(method, path, body, options, true);
      } catch (err) {
        // Backend unreachable / 5xx during refresh: keep the session, surface a
        // retryable error instead of a silent sign-out.
        if (err instanceof ApiError && err.isNetwork) throw err;
        forceSignOut();
        throw new ApiError(401, "Session expired. Please sign in again.");
      }
    }
    forceSignOut();
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  if (res.status === 204) return undefined as T;

  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const record = (payload ?? {}) as Record<string, unknown>;
    const detail = typeof record["detail"] === "string" ? (record["detail"] as string) : null;
    const fields: Record<string, string[]> = {};
    Object.entries(record).forEach(([key, value]) => {
      if (key !== "detail") {
        if (Array.isArray(value)) fields[key] = value.map(String);
        else if (typeof value === "string") fields[key] = [value];
      }
    });
    const fieldMsg = friendlyFieldMessage(fields);
    const fallback =
      res.status === 400
        ? "Please check the details you entered and try again."
        : res.status === 403
          ? "You don't have permission to do that."
          : res.status === 404
            ? "We couldn't find what you were looking for."
            : res.status === 429
              ? "Too many attempts. Please wait a minute and try again."
              : res.status >= 500
                ? "The kitchen server had a hiccup. Please try again in a moment."
                : `Request failed (${res.status})`;
    throw new ApiError(
      res.status,
      detail || (fieldMsg.length > 0 ? fieldMsg : fallback),
      fields,
      res.status >= 500,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: Options) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: Options) => request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: Options) => request<T>("PATCH", path, body, options),
  put: <T>(path: string, body?: unknown, options?: Options) => request<T>("PUT", path, body, options),
  delete: <T>(path: string, options?: Options) => request<T>("DELETE", path, undefined, options),
};
