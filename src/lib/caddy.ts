/**
 * ============================================================================
 * CADDY LAYER — the human who carries the order to the customer
 * ============================================================================
 *
 * A "caddy" is the delivery companion assigned to a customer's live order
 * (the app previously called this a "rider"). This module is the ONLY place
 * the UI reads caddy data from, so a Django backend can replace the stub
 * without touching a single component.
 *
 * DJANGO CONTRACT (see src/lib/api/README.md for the shared conventions)
 *
 *   GET /api/v1/caddies/me/assigned/          -> Caddy | 204 (no active order)
 *   GET /api/v1/caddies/{id}/                 -> Caddy
 *   POST /api/v1/orders/{order_id}/caddy/rate/ { stars: 1..5, note?: string }
 *
 *   Serializer fields expected by this app:
 *     id            str/uuid
 *     name          str
 *     phone         str      (E.164 or local, rendered as tel: link)
 *     avatar_url    str|null (absolute URL; falls back to a bundled photo)
 *     vehicle       str      e.g. "Honda CD 70 — LEB 4471"
 *     rating        number   0..5, one decimal
 *     deliveries    int      lifetime completed deliveries
 *     status        "idle" | "picking" | "onway" | "delivered"
 *     eta_minutes   int|null
 *
 * TO GO LIVE: swap the body of `fetchAssignedCaddy` / `rateCaddy` for
 * `api.get(...)` / `api.post(...)` from "@/lib/api/client". Nothing else changes.
 */
import fallbackAvatar from "@/assets/caddy-avatar.jpg";
import { api, isBackendConfigured, tokens } from "@/lib/api/client";
import { ORDERS, PROFILE } from "@/lib/api/endpoints";

export type CaddyStatus = "idle" | "picking" | "onway" | "delivered" | "confirmed" | "kitchen" | "packed";

export type Caddy = {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  vehicle: string;
  rating: number;
  deliveries: number;
  status: CaddyStatus;
  eta_minutes: number | null;
};

export const CADDY_FALLBACK_AVATAR = fallbackAvatar;

export const CADDY_STATUS_LABEL: Record<CaddyStatus, string> = {
  idle: "Standing by",
  picking: "Picking up your order",
  confirmed: "Order confirmed",
  kitchen: "In the kitchen",
  packed: "Packed & sealed",
  onway: "On the way to you",
  delivered: "Delivered",
};

/** Demo caddy used until VITE_API_BASE_URL points at Django. */
export const DEMO_CADDY: Caddy = {
  id: "caddy-01",
  name: "Bilal Raza",
  phone: "+92 300 4471 220",
  avatar_url: null,
  vehicle: "Honda CD 70 — LEB 4471",
  rating: 4.9,
  deliveries: 1284,
  status: "onway",
  eta_minutes: 18,
};

export function caddyAvatar(caddy: Pick<Caddy, "avatar_url">) {
  return caddy.avatar_url ?? CADDY_FALLBACK_AVATAR;
}

export function caddyInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C"
  );
}

/** Fetches assigned caddy from Django live tracking endpoint GET /api/orders/active-rider/ */
export async function fetchAssignedCaddy(orderStatus?: CaddyStatus | null): Promise<Caddy | null> {
  if (isBackendConfigured() && tokens.access()) {
    try {
      const res = await api.get<Caddy | null>(PROFILE.activeRider);
      if (res && res.name) {
        return res;
      }
    } catch {
      /* ignore and return null if no active order or error */
    }
    return null;
  }

  if (!orderStatus) return null;
  return { ...DEMO_CADDY, status: orderStatus };
}

/** Rates assigned caddy/order via Django POST /api/orders/{orderId}/rate/ */
export async function rateCaddy(orderId: string, stars: number, _note?: string): Promise<void> {
  if (isBackendConfigured() && tokens.access()) {
    await api.post(ORDERS.rate(orderId), { rating: stars });
  }
}

