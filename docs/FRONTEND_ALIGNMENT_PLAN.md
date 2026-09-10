# Frontend Alignment Plan — against Backend v1 (Sep 10 2026)

Companion to `docs/BACKEND_API_REFERENCE.md`. Nothing here is implemented yet.

## A. Contract mismatches to fix first (cheap, high risk if ignored)

| # | Mismatch | Today | Target |
|---|---|---|---|
| A1 | Order status vocabulary | frontend `confirmed/cooking/picking/onway/delivered` | backend `confirmed/kitchen/packed/onway/delivered` — add one mapping module, never scatter string literals |
| A2 | Auth parsing | `signIn()` reads `res.user`, ignores `tenant` and `must_change_password` | one parser for all 4 auth entry points: root `access`/`refresh`, `user`, `user.tenant` |
| A3 | Roles enum | `customer\|staff\|rider\|admin\|kitchen` | backend adds `owner, manager, cashier`; `staff` is not a backend role — map to `kitchen` |
| A4 | Endpoint drift | `endpoints.ts` has `/auth/password-reset/`, `/admin/pending-approvals/`, `/rider/*` guesses | reconcile against the 67-route table; delete or mark endpoints the backend never exposed |
| A5 | Money types | prices arrive as decimal **strings** (`"450.00"`) | parse once at the boundary, never `Number()` inline in components |
| A6 | Dish sizes | UI assumes one price per dish | orders need `size_id`; menu cards need a size selector |
| A7 | Order create body | current body shape is legacy | must send `branch_id` + `items[{dish_id,size_id,qty}]` + `coupon_code` |

## B. Tenant awareness (nothing exists today)

- Send `X-Tenant-Slug` on every request from `client.ts`, sourced from
  `VITE_TENANT_SLUG` in dev and from the subdomain in production.
- Store the tenant returned in the auth payload; show its name in header/footer
  instead of hardcoded "Kennedy Moon Grill".
- Branch picker: `GET /api/branches/` in a sticky bar (delivery/pickup + branch),
  persisted, and injected as `branch_id` on order create. Falls back gracefully
  while the tenant has 0 branches (current DB state).

## C. New surfaces to build, in dependency order

1. **Phone + OTP login** (`phone-otp/` → `phone-verify/`) — becomes the primary
   customer entry; email/password moves to a "staff sign in" tab.
2. **Forced password change** — intercept `must_change_password: true` after
   login, block the app behind a change-password screen.
3. **Coupon field at checkout** — `coupon_code` on order create, show
   `discount` and `delivery_fee` breakdown from the response instead of local math.
4. **Rider earnings page** — wire to the now-real `/api/rider/earnings/`, drop stub.
5. **Admin menu manager** — dish CRUD + Cloudinary image upload + sizes + availability.
6. **Admin staff manager** — create staff/rider, surface `temp_password` once,
   copy-to-clipboard, quota errors (403) shown as "plan limit reached".
7. **Branch manager** — CRUD + quota messaging.
8. **Billing screen** — plan cards, subscription status/days remaining, invoice
   proof upload (JazzCash txn id + receipt image), trial countdown banner.
9. **Self-serve onboarding** — 3-step public flow (`initiate → verify → complete`)
   with WhatsApp code; this is the SaaS front door for new restaurants.
10. **Inventory** — after Phase 6/7 UI settles.

## D. Realtime (Phase 6 prep)

- Wrap all polling in one `useLiveResource(key, fetcher, interval)` hook now, so
  swapping to Channels later is a single implementation change, not 8 edits.
- Planned sockets: `admin.orders`, `orders.<code>.tracking`, `rider.<id>.jobs`.
- Keep polling as automatic fallback when the socket drops (it will, on Railway).

## E. Production hardening

- Health-driven connection banner: ping `GET /api/health/` (not `/menu/`) and
  show degraded-service copy when `services.database` is unhealthy.
- Handle 429 from throttled auth/OTP endpoints with a visible cooldown timer.
- Never trust cached role: `verifyRole()` already re-reads `/profile/`; extend it
  to also re-read tenant + `must_change_password`.
- Show plan-limit (403) and subscription-inactive errors as human copy, since
  `SubscriptionActivePermission` will start blocking admin menu writes.
- Ask backend/infra to confirm `CLOUDINARY_URL` is set before shipping the
  image-upload UI — otherwise uploads silently vanish on redeploy.

## F. Suggested build order (2-week slices)

1. Slice 1 — contract layer: status map, auth parser, roles, tenant header, money parsing. No new UI.
2. Slice 2 — customer: phone OTP login, branch picker, sizes, coupon at checkout.
3. Slice 3 — staff: forced password change, staff manager, rider earnings.
4. Slice 4 — owner: menu manager + image upload, branch manager.
5. Slice 5 — SaaS: onboarding flow + billing screen.
6. Slice 6 — realtime swap behind `useLiveResource`.
