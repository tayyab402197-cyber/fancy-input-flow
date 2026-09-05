import { useEffect, useState } from "react";
import { ApiError, api, isBackendConfigured, tokens } from "@/lib/api/client";
import { AUTH } from "@/lib/api/endpoints";

export type AccountRole = "customer" | "staff" | "rider" | "admin" | "kitchen";

export type AuthAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AccountRole;
  status?: "active" | "pending_approval" | "inactive";
  createdAt: string;
};

const KEY = "kmg.auth.v1";
export const AUTH_EVENT = "kmg-auth-change";

export const ROLE_HOME: Record<string, string> = {
  customer: "/profile",
  staff: "/admin/orders",
  kitchen: "/admin/orders",
  admin: "/admin",
  rider: "/rider",
};

export const ROLE_COPY: Record<
  AccountRole,
  { label: string; tagline: string; destination: string }
> = {
  customer: {
    label: "Customer",
    tagline: "Order, track your rider live and keep your favourites",
    destination: "Customer profile",
  },
  rider: {
    label: "Delivery Rider",
    tagline: "Apply to join our fleet — deliver hot meals & earn per drop",
    destination: "Rider console",
  },
  staff: {
    label: "Kitchen Staff",
    tagline: "Kitchen console: manage tickets, cooking and packing",
    destination: "Staff dashboard",
  },
  kitchen: {
    label: "Kitchen Staff",
    tagline: "Kitchen console: manage tickets, cooking and packing",
    destination: "Staff dashboard",
  },
  admin: {
    label: "Owner / Admin",
    tagline: "Owner console: orders, payments, riders and revenue graphs",
    destination: "Owner console",
  },
};

export function readAccount(): AuthAccount | null {
  if (typeof window === "undefined") return null;
  const token = tokens.access();
  if (!token) return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthAccount) : null;
  } catch {
    return null;
  }
}

export function publish(next: AuthAccount | null) {
  if (typeof window === "undefined") return;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else {
      localStorage.removeItem(KEY);
      tokens.clear();
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

type BackendLoginResponse = {
  access: string;
  refresh: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: AccountRole;
    full_name?: string;
  };
};

type BackendSignupResponse = {
  detail: string;
  username: string;
  role?: string;
  status?: string;
};

export async function signIn(usernameOrEmail: string, pass: string): Promise<AuthAccount> {
  assertBackend();

  const res = await api.post<BackendLoginResponse>(AUTH.login, {
    username: usernameOrEmail.trim(),
    password: pass,
  });

  tokens.set(res.access, res.refresh);

  const u = res.user;
  // The role ALWAYS comes from the backend — never from a UI toggle.
  const account: AuthAccount = {
    id: u?.id ? String(u.id) : `user-${Date.now()}`,
    name: u?.full_name || u?.username || usernameOrEmail.split("@")[0] || "User",
    email: u?.email || (usernameOrEmail.includes("@") ? usernameOrEmail : ""),
    phone: "",
    role: (u?.role || ((u as { is_superuser?: boolean } | undefined)?.is_superuser ? "admin" : "customer")) as AccountRole,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  publish(account);

  // Confirm the role against the authenticated backend profile, so a tampered
  // cached role can never survive.
  const verified = await verifyRole({ force: true });
  if (verified && verified !== account.role) {
    const corrected = { ...account, role: verified };
    publish(corrected);
    return corrected;
  }
  return account;
}

export async function signUp(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: AccountRole;
}): Promise<AuthAccount> {
  assertBackend();

  const rawName = input.name.trim();
  const cleanUsername = rawName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_@.+-]/g, "") || input.email.split("@")[0];

  const requestedRole = input.role === "staff" ? "kitchen" : input.role;

  const res = await api.post<BackendSignupResponse>(AUTH.register, {
    username: cleanUsername,
    email: input.email.trim().toLowerCase(),
    password: input.password,
    full_name: rawName,
    phone: input.phone.trim(),
    requested_role: requestedRole,
  });

  if (res && res.status === "pending_approval") {
    const pendingAccount: AuthAccount = {
      id: cleanUsername,
      name: rawName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      role: (res.role as AccountRole) || input.role,
      status: "pending_approval",
      createdAt: new Date().toISOString(),
    };
    return pendingAccount;
  }

  return signIn(cleanUsername, input.password);
}


/**
 * Sign out: blacklist the refresh token server-side (SimpleJWT) *before*
 * clearing local state, so a stolen token can't be replayed for 7 days.
 * Fire-and-forget — local state is cleared either way.
 */
export function signOut() {
  const refresh = tokens.refresh();
  if (isBackendConfigured() && refresh) {
    void api.post(AUTH.logout, { refresh }).catch(() => {
      /* endpoint missing or offline — local purge still happens */
    });
  }
  clearVerifiedRole();
  publish(null);
}

/**
 * Server-verified role, cached in memory for the tab session.
 * Route guards use this instead of trusting localStorage.
 */
let _verifiedRole: AccountRole | null = null;
let _verifyPromise: Promise<AccountRole | null> | null = null;

export function clearVerifiedRole() {
  _verifiedRole = null;
  _verifyPromise = null;
  _emailVerified = null;
}

/** Mirrors Django's validators: 8+ chars, at least one letter and one digit. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw))
    return "Password needs at least one letter and one number.";
  return null;
}


type MeResponse = {
  role?: AccountRole;
  user?: { role?: AccountRole };
  is_superuser?: boolean;
  is_staff?: boolean;
  is_email_verified?: boolean;
};

/** Last profile flags seen from `/api/profile/` (server truth, never localStorage). */
let _emailVerified: boolean | null = null;
export const isEmailVerified = () => _emailVerified;

export async function verifyRole(opts: { force?: boolean } = {}): Promise<AccountRole | null> {
  if (!isBackendConfigured() || !tokens.access()) return null;
  if (_verifiedRole && !opts.force) return _verifiedRole;
  if (_verifyPromise && !opts.force) return _verifyPromise;
  _verifyPromise = (async () => {
    try {
      const me = await api.get<MeResponse>(AUTH.me);
      if (typeof me.is_email_verified === "boolean") _emailVerified = me.is_email_verified;
      const role = (me.role ||
        me.user?.role ||
        (me.is_superuser ? "admin" : me.is_staff ? "staff" : undefined)) as AccountRole | undefined;

      if (role) {
        _verifiedRole = role;
        const cached = readAccount();
        if (cached && cached.role !== role) publish({ ...cached, role });
      }
      return role ?? null;
    } catch (err) {
      // Offline / cold start: don't invalidate anything, fall back to cache.
      if (err instanceof ApiError && err.isNetwork) return null;
      throw err;
    } finally {
      _verifyPromise = null;
    }
  })();
  return _verifyPromise;
}

function assertBackend() {
  if (!isBackendConfigured()) {
    throw new ApiError(
      0,
      "This app isn't connected to its server, so sign in is unavailable. Please contact support.",
    );
  }
}

export function useAccount() {
  const [account, setAccount] = useState<AuthAccount | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => setAccount(readAccount());
    sync();
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { account: account ?? null, isLoading: account === undefined };
}
