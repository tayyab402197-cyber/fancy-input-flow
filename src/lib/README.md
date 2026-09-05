# `src/lib` — domain stubs and their Django endpoints

Each module is the single source of truth for one domain. Components import
these; they never import `api/client` directly. Replace a stub body with an
`api.*` call and that feature goes live.

| Module | What it holds today | Django endpoints to inject |
| --- | --- | --- |
| `account.ts` | localStorage profile + orders (`fetchProfile`, `saveProfile`, `fetchOrders`) | `GET/PATCH /profiles/me/`, `GET /orders/?mine=1`, `GET /orders/{id}/` |
| `caddy.ts` | assigned delivery caddy (`fetchAssignedCaddy`, `rateCaddy`) | `GET /caddies/me/assigned/`, `GET /caddies/{id}/`, `POST /orders/{id}/caddy/rate/` |
| `orders.ts` | order stages, payment methods, saved addresses | `GET /orders/stages/`, `GET /payments/methods/`, `GET/POST/DELETE /addresses/` |
| `cart.ts` | cart, wishlist, likes (localStorage) | `GET/POST/PATCH/DELETE /cart/items/`, `GET/POST /wishlist/`, `POST /dishes/{slug}/like/` |
| `menu.ts` | dish catalogue | `GET /dishes/`, `GET /dishes/{slug}/`, `GET /categories/` |
| `admin-store.ts` | admin console data (orders, riders, customers, payments) | `GET /admin/orders/`, `PATCH /admin/orders/{id}/`, `GET /admin/caddies/`, `GET /admin/customers/`, `GET /admin/payments/` |
| `auth.ts` / `auth-guard.ts` | local session + route gate | `POST /auth/token/`, `POST /auth/register/`, `GET /auth/me/` |
| `rider-location.ts` | simulated caddy GPS | `GET /orders/{id}/caddy/location/` (poll 5–10 s) or WebSocket `ws://…/ws/orders/{id}/` |
| `voice.functions.ts` / `voice.server.ts` | server-side AI voice ordering | keep server-side; secrets via `process.env` inside the handler |
| `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts`, `utils.ts`, `sfx.ts` | platform/UI plumbing | no backend |

## Pattern for going live

```ts
// before
export async function fetchOrders(_userId: string) { return read().orders; }

// after
import { api, isBackendConfigured } from "@/lib/api/client";
export async function fetchOrders(): Promise<DbOrder[]> {
  if (!isBackendConfigured()) return read().orders;      // keep the demo path
  const page = await api.get<{ results: DbOrder[] }>("/orders/", { query: { mine: 1 } });
  return page.results;
}
```

Keep the stub fallback: it is what lets the preview render before Django exists.
Serializer field names must match the exported TypeScript types in each module.

## `tracking.ts`

Single source of truth for live order tracking: stage timeline + timestamps,
courier position, remaining distance, ETA, speed and progress.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/orders/{code}/tracking/` | `TrackingSnapshot` |
| `GET /api/v1/orders/{code}/tracking/stream/` | same payload over SSE / Channels WS |

Snapshot fields: `order_code`, `status`, `placed_at`, `eta_at`, `progress`,
`courier {lat,lng,speed_kmh}`, `origin`, `target`, `stages [{key, at}]`.

Until then `simulateTracking()` produces the same shape locally and
`demoTargetFor(orderCode)` invents a deterministic drop pin 0.9–2.4 km from the
branch. Replace `simulateTracking` with `api.get(...)` — no component changes.
