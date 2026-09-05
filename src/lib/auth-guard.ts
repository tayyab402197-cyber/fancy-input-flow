/**
 * Route guards for the dashboards (/profile, /admin, /rider).
 *
 * The cached account in localStorage is only used for the *instant* redirect
 * (so nothing flashes). The authoritative role is then read from the backend
 * (`AUTH.me`) via `verifyRole()`, so editing localStorage in DevTools can no
 * longer unlock an admin UI. If the backend is unreachable (Railway cold start)
 * we keep the cached role rather than logging people out.
 */
import { redirect } from "@tanstack/react-router";

import { ROLE_HOME, readAccount, verifyRole, type AccountRole } from "@/lib/auth";

/** Where the user was heading, so login can bounce them straight back. */
export type RedirectSearch = { redirect?: string };

export const validateRedirectSearch = (search: Record<string, unknown>): RedirectSearch => {
  const raw = search["redirect"];
  // Only same-origin, path-style redirects — never an absolute URL.
  return typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? { redirect: raw } : {};
};

export function requireRole(allowed: AccountRole[]) {
  return async ({ location }: { location: { href: string } }) => {
    // These routes render client-side (ssr: false), so localStorage is safe.
    if (typeof window === "undefined") return;

    const account = readAccount();
    if (!account) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    // Server-verified role wins; cached role is the offline fallback.
    let role: AccountRole = account.role;
    try {
      const verified = await verifyRole();
      if (verified) role = verified;
    } catch {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    if (!allowed.includes(role)) {
      throw redirect({ to: ROLE_HOME[role] ?? "/" });
    }
  };
}
