# Kennedy Backend — Verified API Reference

**Last verified:** 16 Sep 2026, by fetching `GET /api/schema/` (OpenAPI 3.0, 75 paths)
from `https://overflowing-essence-production-6d94.up.railway.app` and probing routes with curl.

This file replaces all earlier drafts. Everything in section 1 is **verified live**.
Everything in section 2 is **specified by the owner's master guide but NOT deployed yet**
at the configured URL — do not code against it without a feature flag.

> Frontend rule: one HTTP door, `src/lib/api/client.ts`. Paths live in
> `src/lib/api/endpoints.ts`. No component calls `fetch()` directly.

---

## 0. The single most important finding

The deployed backend at the URL in `.env` is the **pre-multi-tenant build**.
Phases 5–8 (tenants, branches, inventory, admin menu CRUD, coupons, billing,
onboarding, phone+OTP, rider earnings) exist in the owner's codebase/spec but are
**not live on this host**. Verified 404s:

| Path from the master guide | Live status |
|---|---|
| `/api/auth/phone-otp/`, `/api/auth/phone-verify/` | not in schema |
| `/api/branches/`, `/api/admin/branches/` | 404 |
| `/api/inventory/` | 404 |
| `/api/admin/menu/dishes/`, `/discounts/`, `upload-image` | 404 |
| `/api/admin/staff/` | 404 |
| `/api/billing/plans/`, `/api/billing/subscription/` | 404 |
| `/api/onboard/initiate|verify|complete/` | 404 |
| `/api/orders/apply-coupon/` **and** `/api/menu/apply-coupon/` | 404 (both) |
| `/api/rider/earnings/` **and** `/api/auth/rider/earnings/` | 404 (both) |
| `/api/auth/me/` | 404 — profile is `/api/profile/` |
| `/api/health/` | not in schema |

Treat every Phase 5–8 screen as **blocked on a backend redeploy**, not on frontend work.

---

## 1. Live, verified surface (75 paths)

Routes are **dual-mounted**: most account routes answer at both `/api/<x>/` and
`/api/auth/<x>/`. Both are real. Use the short form (`/api/rider/profile/`) —
this settles the earlier `/auth/` prefix confusion: neither doc was wrong, the
backend exposes both.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login/` | `{username, password}` → `{access, refresh, user}` (SimpleJWT) |
| POST | `/api/auth/refresh/` | `{refresh}` → `{access}` |
| POST | `/api/auth/signup/` | `{username, email, password, full_name, phone, requested_role}` |
| POST | `/api/auth/logout/` | also `/api/logout/` |
| POST | `/api/auth/password-reset/` · `/password-reset-confirm/` | live (earlier doc doubted these — they exist) |
| POST | `/api/auth/send-otp/` · `/api/auth/verify-otp/` | **email** verification OTP for a signed-in user, NOT phone login |
| GET/PATCH | `/api/profile/` | current user; `/api/auth/profile/` is the alias |
| POST | `/api/profile/change-password/` | `{current_password, new_password}` |
| GET/POST/PATCH/DELETE | `/api/addresses/`, `/api/addresses/{id}/`, `/{id}/set-default/` | saved addresses |

### Menu
`GET /api/menu/categories/` · `GET /api/menu/dishes/` · `GET /api/menu/dishes/{slug}/` · `GET /api/menu/book/`
Read-only. **No admin menu CRUD, no image upload, no discounts endpoint live.**

### Favourites
`GET/POST /api/favourites/` · `DELETE /api/favourites/{id}/` · `POST /api/favourites/merge/`

### Orders
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/orders/` | list own orders / create |
| GET | `/api/orders/all/` | staff feed |
| GET | `/api/orders/analytics/` | 401 without staff token; **field names unconfirmed — parse defensively** |
| GET | `/api/orders/customers/` · `/api/orders/payments/` | staff |
| GET | `/api/orders/rider-jobs/` · `/api/orders/active-rider/` | |
| PATCH | `/api/orders/{id}/status/` | status advance |
| PATCH | `/api/orders/{id}/controls/` | priority, ETA, internal notes |
| POST | `/api/orders/{id}/assign-rider/` · `/reject/` · `/rate/` · `/verify-payment/` | |
| PATCH | `/api/orders/{id}/payment-status/` | |
| GET/POST | `/api/orders/{id}/rider-location/` | |
| DELETE | `/api/orders/{id}/` | admin hard delete |
| POST/GET | `/api/orders/voice-order/` · `/voice-status/` | ElevenLabs agent |

**Order status vocabulary (authoritative):**
`pending → confirmed → kitchen → packed → onway → delivered` (`cancelled` anywhere).
The frontend still says `cooking`/`picking` in places — that mapping is still owed.

**Order create body — live build:** `{items[{dish_slug|dish_id, size, qty}], payment, address{...}}`.
The guide's `{branch_id, items[{dish_id, size_id, qty}], coupon_code}` shape is the
**future** contract; sending it today will be ignored or 400.

### Riders (both prefixes live)
`GET/PATCH /api/rider/profile/` · `POST /api/rider/duty-status/` (always POST) · `POST /api/rider/location-share/`
**`/api/rider/earnings/` is NOT live** (404 on both prefixes).

### Admin / riders fleet
`GET/POST /api/admin/riders/` · `/{user_id}/approve|reject|verify|fleet-verify|settle-cash/` · `GET /api/admin/pending-approvals/`

### Voice agent tools
`/api/elevenlabs/signed-url/`, `/tools/menu/`, `/tools/my-orders/`, `/tools/order-status/`, `/tools/place-order/`

---

## 2. Specified but not deployed (owner's master guide)

Code these only behind a capability check (404 → hide the feature).

- **Multi-tenancy:** `X-Tenant-Slug` header on every request, slug from a global
  context (`VITE_DEFAULT_TENANT_SLUG=moon-grill-narowal` in dev, subdomain in prod).
  Harmless to send now — the live build ignores unknown headers.
- **Roles (7):** `customer, kitchen, rider, admin, owner, manager, cashier`.
  The live build only issues `customer, kitchen, rider, admin`.
- **`must_change_password: true`** in the login response → force `/change-password`.
- **Phone+OTP customers:** `POST /api/auth/phone-otp/ {phone}` →
  `POST /api/auth/phone-verify/ {phone, code}` → tokens + `is_new_customer`.
- **Onboarding wizard:** `/api/onboard/initiate → verify → complete`.
- **Branches:** `GET /api/branches/` (public picker), `GET/POST/PATCH /api/admin/branches/`.
- **Dish sizes:** `sizes:[{id, size, price}]`, orders carry `size_id`.
- **Coupons:** apply-coupon preview endpoint — **path disputed**
  (`/api/orders/apply-coupon/` per guide vs `/api/menu/apply-coupon/` per earlier note);
  neither exists yet, so try one and fall back to the other.
- **Inventory:** `GET /api/inventory/`, `POST /api/inventory/{id}/adjust/`,
  low-stock when `current_stock <= reorder_threshold`.
- **Admin menu:** dish/category CRUD, `POST .../dishes/{id}/upload-image/` (multipart, Cloudinary),
  `/api/admin/menu/discounts/`.
- **Staff:** `POST /api/admin/staff/ {role, phone, full_name}` → returns a one-time `temp_password`.
- **Billing:** `/api/billing/plans/`, `/api/billing/subscription/`,
  `/api/billing/invoices/{id}/submit-proof/`.
- **Money:** prices arrive as decimal **strings** (`"450.00"`). Parse once at the boundary.
- **Prices are server-authoritative** — the backend recalculates `unit_price`;
  never show the cart total as the final bill, read it from the order response.

---

## 3. Explicitly UNCONFIRMED — code defensively

| Thing | How to handle |
|---|---|
| Analytics field names | `data.avg_order_value ?? data.average_order_value ?? 0` |
| WebSockets / realtime | **Not confirmed to exist.** Poll only. No WS code. |
| Coupon endpoint path | try both paths, fall back silently |
| `total` vs `grand_total` | the field is `total` |
| Cloudinary on Railway | uploads are lost on redeploy unless `CLOUDINARY_URL` is set (infra owner's job) |

## 4. Polling intervals (until realtime is confirmed)

Customer tracking 3–5 s · admin order feed 10 s · rider job board 10–15 s ·
rider GPS share 10–15 s while online. Wrap all of them in one
`useLiveResource(key, fetcher, interval)` hook so a future socket swap is one change.
