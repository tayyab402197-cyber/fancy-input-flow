/**
 * ============================================================================
 * ORDER TRACKING LAYER — demo simulation today, Django stream tomorrow
 * ============================================================================
 *
 * Everything the customer sees on the "Live tracking" tab is derived here:
 * stage timeline + timestamps, courier position, remaining distance, ETA,
 * speed and progress. The UI never computes tracking numbers itself.
 *
 * DJANGO CONTRACT (see src/lib/api/README.md for shared conventions)
 *
 *   GET  /api/v1/orders/{code}/tracking/      -> TrackingSnapshot
 *   GET  /api/v1/orders/{code}/tracking/stream/  (SSE / Channels WS, same shape)
 *
 *   TrackingSnapshot serializer:
 *     order_code    str
 *     status        "confirmed" | "kitchen" | "packed" | "onway" | "delivered"
 *     placed_at     ISO datetime
 *     eta_at        ISO datetime
 *     progress      float 0..1        (route completion)
 *     courier       { lat, lng, speed_kmh, heading? } | null
 *     target        { lat, lng }      (customer drop pin)
 *     origin        { lat, lng }      (branch pickup pin)
 *     stages        [{ key, at | null }]
 *
 * TO GO LIVE: replace `simulateTracking` with `api.get(...)` (or subscribe to
 * the stream) and keep returning the same `TrackingSnapshot` shape. Components
 * and the `useOrderTracking` hook keep working unchanged.
 */
import { ORDER_STAGES, type OrderStatusKey } from "@/lib/orders";
import { RESTAURANT, distanceKm } from "@/components/kennedy/TrackMap";

export type LatLng = { lat: number; lng: number };

export type TrackingStage = {
  key: OrderStatusKey;
  label: string;
  hint: string;
  /** ISO timestamp when this stage was reached, null when still pending. */
  at: string | null;
  done: boolean;
  active: boolean;
};

export type TrackingSnapshot = {
  orderCode: string;
  status: OrderStatusKey;
  placedAt: string;
  etaAt: string;
  /** 0..1 across the whole journey (kitchen → doorstep). */
  progress: number;
  /** 0..1 across the road leg only (courier movement). */
  rideProgress: number;
  etaMinutes: number;
  remainingKm: number;
  totalKm: number;
  speedKmh: number;
  courier: LatLng | null;
  origin: LatLng;
  target: LatLng;
  /** true when the drop pin was inferred for the demo instead of captured. */
  targetIsApproximate: boolean;
  stages: TrackingStage[];
  delivered: boolean;
};

/**
 * Minutes each stage takes in the demo timeline. Deliberately compressed so a
 * reviewer sees the full journey (kitchen → doorstep) in ~4 minutes.
 * With a real backend these numbers come from the API and this table is unused.
 */
export const DEMO_STAGE_MINUTES: Record<OrderStatusKey, number> = {
  confirmed: 0.3,
  kitchen: 1,
  packed: 0.6,
  onway: 2.1,
  delivered: 0,
};


const TOTAL_MINUTES =
  DEMO_STAGE_MINUTES.confirmed +
  DEMO_STAGE_MINUTES.kitchen +
  DEMO_STAGE_MINUTES.packed +
  DEMO_STAGE_MINUTES.onway;

/**
 * Deterministic pseudo drop pin ~0.9–2.4 km from the branch, derived from the
 * order code so the same order always tracks to the same place.
 */
export function demoTargetFor(orderCode: string): LatLng {
  let hash = 0;
  for (const ch of orderCode) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  const angle = (hash % 360) * (Math.PI / 180);
  const km = 0.9 + ((hash >> 4) % 150) / 100; // 0.9 .. 2.39 km
  const dLat = (km / 111) * Math.cos(angle);
  const dLng = (km / (111 * Math.cos((RESTAURANT.lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: RESTAURANT.lat + dLat, lng: RESTAURANT.lng + dLng };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Build a tracking snapshot from an order. `status` acts as a floor: the demo
 * clock never shows less progress than the backend/admin already reported.
 */
export function simulateTracking(input: {
  orderCode: string;
  createdAt: string;
  status: OrderStatusKey;
  target?: LatLng | null;
  now?: number;
}): TrackingSnapshot {
  const now = input.now ?? Date.now();
  const placed = new Date(input.createdAt).getTime();
  const elapsedMin = Math.max(0, (now - placed) / 60000);

  const target = input.target ?? demoTargetFor(input.orderCode);
  const targetIsApproximate = !input.target;
  const totalKm = distanceKm(RESTAURANT, target);

  // Where the demo clock says we are, floored by the reported status.
  const order: OrderStatusKey[] = ORDER_STAGES.map((s) => s.key);
  const reportedIdx = Math.max(0, order.indexOf(input.status));

  let cursor = 0;
  const stageAt: Partial<Record<OrderStatusKey, string>> = {};
  let clockIdx = 0;
  for (let i = 0; i < order.length; i += 1) {
    const key = order[i]!;
    if (elapsedMin >= cursor) {
      stageAt[key] = new Date(placed + cursor * 60000).toISOString();
      clockIdx = i;
    }
    cursor += DEMO_STAGE_MINUTES[key];
  }
  const idx = reportedIdx;
  // Backfill timestamps for stages confirmed up to reportedIdx.
  let fill = 0;
  for (let i = 0; i <= idx; i += 1) {
    const key = order[i]!;
    if (!stageAt[key]) stageAt[key] = new Date(placed + fill * 60000).toISOString();
    fill += DEMO_STAGE_MINUTES[key];
  }

  const status = order[idx]!;
  const delivered = status === "delivered";

  const progress = delivered ? 1 : Math.min(0.99, elapsedMin / TOTAL_MINUTES);
  const rideStartMin =
    DEMO_STAGE_MINUTES.confirmed + DEMO_STAGE_MINUTES.kitchen + DEMO_STAGE_MINUTES.packed;
  const rideProgress = delivered
    ? 1
    : Math.max(
        0,
        Math.min(1, (elapsedMin - rideStartMin) / Math.max(1, DEMO_STAGE_MINUTES.onway)),
      );

  const courier =
    status === "onway" || delivered
      ? {
          lat: lerp(RESTAURANT.lat, target.lat, rideProgress),
          lng: lerp(RESTAURANT.lng, target.lng, rideProgress),
        }
      : null;

  const remainingKm = delivered ? 0 : totalKm * (1 - rideProgress);
  const etaMinutes = delivered ? 0 : Math.max(1, Math.round(TOTAL_MINUTES - elapsedMin));
  const speedKmh = courier && !delivered ? 22 + ((rideProgress * 100) % 9) : 0;

  const stages: TrackingStage[] = ORDER_STAGES.map((s, i) => ({
    key: s.key,
    label: s.label,
    hint: s.hint,
    at: stageAt[s.key] ?? null,
    done: i <= idx,
    active: i === idx && !delivered,
  }));

  return {
    orderCode: input.orderCode,
    status,
    placedAt: new Date(placed).toISOString(),
    etaAt: new Date(placed + TOTAL_MINUTES * 60000).toISOString(),
    progress,
    rideProgress,
    etaMinutes,
    remainingKm,
    totalKm,
    speedKmh,
    courier,
    origin: { lat: RESTAURANT.lat, lng: RESTAURANT.lng },
    target,
    targetIsApproximate,
    stages,
    delivered,
  };
}

export function formatClock(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}
