# Frontend vs Backend — Complete Gap Analysis (16 Sep 2026)

Compares every screen in this repo against the verified live backend
(`docs/BACKEND_LIVE_TEST_RESULTS.md`) and the owner's master guide
(future contract, `docs/BACKEND_API_REFERENCE.md` §2).

Legend: **BUILT** = exists and wired · **PARTIAL** = exists, incomplete or on stub
data · **MISSING** = no screen · **BLOCKED** = frontend can't finish, endpoint 404s.

---

## 1. Route inventory today (21 routes)

| Route | Role | State |
|---|---|---|
| `/` | public | BUILT — storefront, GSAP hero, menu rail, mascot footer |
| `/dish/$slug` | public | BUILT |
| `/cart` | customer | PARTIAL — no size_id, no coupon, no branch |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | public | BUILT (password only) |
| `/profile` | customer | BUILT — orders, addresses, tracking, security |
| `/admin`, `/admin/orders`, `/admin/orders/$id`, `/admin/riders` | admin | BUILT |
| `/admin/customers`, `/admin/payments` | admin | PARTIAL |
| `/rider`, `/rider/jobs`, `/rider/profile` | rider | BUILT |
| `/rider/earnings` | rider | BLOCKED — endpoint 404, runs on local data |

No `/kitchen`, `/change-password`, `/onboard`, `/admin/menu`, `/admin/inventory`,
`/admin/staff`, `/admin/branches`, `/admin/billing`.

---

## 2. Feature-by-feature

### Ready to build now (live endpoints exist)

| Gap | What's missing in the frontend | Endpoint |
|---|---|---|
| **Status vocabulary** | code still says `cooking`/`picking` in places; backend says `kitchen`/`packed`. One mapping module, no scattered literals | `PATCH /api/orders/{id}/status/` |
| **Money as strings** | prices come as `"450.00"`; components call `Number()` inline | all price fields |
| **Auth parser** | `signIn()` reads `res.user` only; ignores tenant + `must_change_password` | `/api/auth/login/` |
| **`/kitchen` screen** | kitchen role lands on `/admin/orders` instead of a focused ticket board | `/api/orders/all/` |
| **Analytics defensiveness** | dashboard assumes exact field names | `/api/orders/analytics/` |
| **Multi-item order body** | `createOrder()` sends `{dish_slug, size, qty}` strings; fine today, wrong tomorrow | `POST /api/orders/` |
| **Polling abstraction** | 6 separate intervals hardcoded across files → one `useLiveResource` hook | — |
| **Client bypasses** | `ConnectionBanner` and `VoiceOrderButton` call `fetch()` directly, skipping the client | — |

### Blocked on backend redeploy (404 today)

| Feature | Frontend state | Blocking endpoint |
|---|---|---|
| Tenant awareness / `X-Tenant-Slug` | none — "Kennedy Moon Grill" hardcoded | header is harmless now; build it anyway |
| Branch picker + `branch_id` on order | none | `/api/branches/` |
| Dish sizes with `size_id` | menu assumes one price per dish | dish `sizes[]` |
| Coupon box at checkout | none | apply-coupon (path disputed) |
| Phone + OTP customer login | none — password-only | `/api/auth/phone-otp|phone-verify/` |
| Forced password change | none | `must_change_password` flag |
| Roles owner/manager/cashier | enum has 5, backend will have 7 | login `user.role` |
| Admin menu manager + image upload | none | `/api/admin/menu/*` |
| Inventory screen | none | `/api/inventory/` |
| Staff manager + temp password | none | `/api/admin/staff/` |
| Branch manager | none | `/api/admin/branches/` |
| Billing / plans / invoice proof | none | `/api/billing/*` |
| Self-serve onboarding wizard | none | `/api/onboard/*` |
| Rider earnings | screen exists, local data | `/api/rider/earnings/` |
| Health-driven banner | banner pings `/api/menu/` | `/api/health/` |

### Realtime

No WebSocket/SSE anywhere. All polling: admin/rider ~10 s, customer tracking ~3 s,
rider location 6–12 s. Customer tracking still synthesises stage progress locally
even when a real rider position is returned. Keep polling — realtime is unconfirmed.

### Design consistency

Three visual languages merged: warm glass/motion storefront, dark shadcn admin,
third rider console layout. Three nav systems, duplicate dish/card/tracking
components. Target: one Caddy token set across all three; keep storefront motion.

---

## 3. Recommended order

1. **Contract layer** (no new UI, ~1 day): status map, money parser, auth parser
   with tenant + `must_change_password`, 7-role enum, `X-Tenant-Slug` header,
   `useLiveResource`, kill the two `fetch()` bypasses.
2. **Kitchen screen** + role redirects — buildable today.
3. **Customer upgrades** once deployed: phone OTP, branch picker, sizes, coupon.
4. **Owner tools:** menu manager + upload, staff, branches, inventory.
5. **Billing + onboarding.**
6. **Design unification pass.**
7. **Realtime** — only after the backend confirms sockets exist.

Everything in step 1 and 2 can start immediately; steps 3–5 need the Railway host
to be redeployed with the Phase 5–8 build first.
