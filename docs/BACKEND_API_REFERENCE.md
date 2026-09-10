# Kennedy Backend — Authoritative API Reference (v1, Sep 10 2026)

Source of truth: Django multi-tenant SaaS backend (Phases 1–8).
Live schema: `GET /api/schema/` · Swagger UI: `GET /api/docs/`
Base URL (prod): `https://overflowing-essence-production-6d94.up.railway.app/api`

> Frontend rule: this file is reference only. The single HTTP door stays
> `src/lib/api/client.ts`; paths live in `src/lib/api/endpoints.ts`.

---

## 0. Conventions

- **Multi-tenancy**: resolved by subdomain, custom domain, or `X-Tenant-Slug`
  header (`tenants.middleware.TenantMiddleware`). Isolation enforced in the ORM
  via `TenantAwareManager.for_tenant()`.
- **Auth**: JWT `Authorization: Bearer <access>`. Tokens carry `tenant_slug`
  and `role` claims. Refresh rotated + blacklisted (SimpleJWT).
- **Concurrency**: `select_for_update()` pessimistic locks on tenant quotas
  (max_branches, max_staff) and on stock deduction at order create.
- **Auth response shape is unified** across login / phone-verify / staff login /
  onboard-complete: root `access`, root `refresh`, `user{...}`, `user.tenant{id,name,slug}`.
  Extra flags: `must_change_password` (login), `is_new_customer` (phone-verify).

---

## 1. Accounts & Auth (`accounts`)

| Method | Path | Perms / throttle | Notes |
|---|---|---|---|
| POST | `/api/auth/login/` | AllowAny, 5/min | `{username,password}` → `access, refresh, must_change_password, user{...,tenant}` |
| POST | `/api/auth/refresh/` | AllowAny | `{refresh}` → `{access, refresh}` (rotation) |
| POST | `/api/auth/signup/` | AllowAny, 5/min | role forced `customer`; returns nested `tokens{access,refresh}` |
| POST | `/api/auth/phone-otp/` | AllowAny, 5/min + max 3/10min per phone | `{phone}` → `{message}` |
| POST | `/api/auth/phone-verify/` | AllowAny, 5 attempts lockout | `{phone,code}` → tokens + `is_new_customer`; creates the user silently |
| GET/PATCH | `/api/profile/` | IsAuthenticated | `{id,username,email,role,full_name,phone,avatar_url}` |
| POST | `/api/profile/change-password/` | IsAuthenticated | `{current_password,new_password}` |
| GET/POST | `/api/addresses/` | IsAuthenticated | `{label,name,phone,street,area,city,notes,lat,lng,is_default}` |
| GET | `/api/rider/profile/` | IsAuthenticated | `{duty_status,cash_in_hand,total_earned,verified}` |
| POST | `/api/rider/duty-status/` | IsAuthenticated | `{duty_status:"online"\|"offline"}` |
| POST | `/api/rider/location-share/` | IsAuthenticated, 60/min | `{lat,lng}` |
| GET | `/api/rider/earnings/` | IsAuthenticated (rider) | **NEW** — `cash_in_hand,total_earned,base_salary,total_delivered_count,today_delivered_count,active_deliveries_count,total_delivery_fees,today_delivery_fees,recent_deliveries[10]` |
| GET | `/api/admin/riders/` | IsAdminUserOrRole | rider list with cash/earnings/delivered_count |
| POST | `/api/admin/staff/` | IsAdminUserOrRole | `{role,phone,full_name}` → `{id,username,role,temp_password}`; quota-locked |

`Role.choices`: `customer, kitchen, rider, admin, owner, manager, cashier`.

---

## 2. Menu (`menu`)

| Method | Path | Perms | Notes |
|---|---|---|---|
| GET | `/api/menu/categories/` | AllowAny | categories with nested dishes + `sizes[]` |
| GET | `/api/menu/dishes/` | AllowAny | `?category=<slug>&featured=true` |
| GET | `/api/menu/dishes/<slug>/` | AllowAny | dish detail |
| GET/POST | `/api/admin/menu/dishes/` | IsAdminRole + SubscriptionActive | `{category_id,name,slug,base_price,description,accent,is_available,sizes[]}` |
| POST | `/api/admin/menu/dishes/<id>/upload-image/` | IsAdminRole + SubscriptionActive | multipart `image` → `{image_url}` (Cloudinary) |

Dish payload: `id, name, slug, base_price (string decimal), image_url, is_available, sizes[{id,size,price}]`.

---

## 3. Orders (`orders`)

| Method | Path | Perms | Notes |
|---|---|---|---|
| POST | `/api/orders/` | AllowAny | `{branch_id, items[{dish_id,size_id,qty}], customer_name, customer_phone, delivery_address, lat, lng, payment_method, coupon_code}` → `{id,order_code,status,subtotal,discount,delivery_fee,total,payment,created_at}` |
| PATCH | `/api/orders/<id>/status/` | CanAdvanceStatus (per-role) | `confirmed → kitchen → packed → onway → delivered` |
| POST | `/api/orders/<id>/assign-rider/` | CanAssignRider (admin/owner/manager/kitchen) | `{rider_id}` |
| GET | `/api/orders/analytics/` | HasStaffPermission("analytics.view"), 60s Redis cache | `total_revenue, today_revenue, total_orders, today_orders, avg_order_value, top_dishes[]` |

Status vocabulary changed: backend uses **`kitchen`** and **`packed`**
(frontend currently speaks `cooking`/`picking`). Needs a mapping layer.

---

## 4. Tenants & Branches (`tenants`)

| Method | Path | Perms |
|---|---|---|
| GET | `/api/branches/` | AllowAny — public branch picker |
| GET/POST | `/api/admin/branches/` | HasStaffPermission("branches.manage"), quota-locked |
| GET/PATCH/DELETE | `/api/admin/branches/<id>/` | same (DELETE = deactivate) |

Branch: `{id,name,slug,phone,address,city,operating_hours,is_active}`.
Live DB today: 1 tenant (Moon Grill Narowal), 0 branches, 175/175 orders `branch=NULL` (nullable by design).

---

## 5. Billing (`billing`)

| Method | Path | Perms |
|---|---|---|
| GET | `/api/billing/plans/` | AllowAny — Starter 5000 / Growth 8000 / Pro 12000 PKR |
| GET | `/api/billing/subscription/` | IsAuthenticated — `{status, plan, days_remaining}` |
| POST | `/api/billing/invoices/<id>/submit-proof/` | billing.manage — `{jazzcash_transaction_id, payment_proof_url}` |
| POST | `/api/billing/invoices/<id>/verify/` | platform superadmin — `{action, admin_notes}` |

Plan features flags: `whatsapp_bot, analytics(basic|advanced|enterprise), inventory, priority_support, custom_branding`; quotas `max_branches, max_staff`.
Hourly expiry job guarded by a Redis `SETNX` distributed lock (safe under multiple Daphne workers).

---

## 6. Onboarding (`onboarding`)

`POST /api/onboard/initiate/` `{phone}` → WhatsApp code
`POST /api/onboard/verify/` `{phone,code}` → `{verification_token}`
`POST /api/onboard/complete/` `{verification_token,restaurant_name,owner_name,owner_password}`
→ root `access`/`refresh` + `tenant` + `branch` + `user` (role `owner`).

---

## 7. Platform

`GET /api/health/` — db/cache/channels health + subscription metrics.
`GET /api/schema/` — OpenAPI 3.0 (81.9 KB) · `GET /api/docs/` — Swagger UI.

---

## 8. Permission matrix (summary)

| Role | Can | Cannot |
|---|---|---|
| owner | everything tenant-scoped incl. billing, staff, branches, menu, inventory, discounts, analytics | platform invoice verify, cross-tenant |
| admin | same as owner operationally | platform invoice verify, cross-tenant |
| manager | branches, menu view/edit, discounts, orders (view/advance/assign), payments verify, inventory, analytics | staff.manage, billing.manage |
| cashier | orders view/create/advance, payments view/verify, menu view, customers view | menu edit, discounts, branches, inventory edit, analytics, billing, rider assign |
| kitchen | orders view + advance `confirmed→kitchen→packed`, inventory view, menu view | prices, discounts, payments, analytics, billing, branch/staff mgmt |
| rider | jobs, earnings, duty-status, location-share, advance `packed→onway→delivered` | admin dashboards, analytics, billing, inventory, menu, customer records |
| customer | menu, order create/view own/rate, addresses, favourites | all staff/admin operations |

---

## 9. Open items owned by backend/infra

- `CLOUDINARY_URL` must be set on Railway or uploaded dish images are lost on redeploy.
- WebSockets (Phase 6) specced but not wired — frontend is still HTTP polling.
