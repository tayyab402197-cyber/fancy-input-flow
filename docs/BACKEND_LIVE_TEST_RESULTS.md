# Live Backend Verification — 16 Sep 2026

Method: downloaded `GET /api/schema/` (OpenAPI 3.0, 75 paths) and probed individual
routes with curl against
`https://overflowing-essence-production-6d94.up.railway.app`.

## Result

The deployed build is the **pre-multi-tenant backend**. It is NOT the
Phase 1–8 SaaS backend described in the owner's audit and master guide.

### Confirmed reachable (route exists)

Auth/login/refresh/signup/logout, password reset (+confirm), email send-otp/verify-otp,
`/api/profile/` (+`/api/auth/profile/`), change-password, addresses (+set-default),
menu categories/dishes/dish-detail/book, favourites (+merge), orders list/create/all/
analytics/customers/payments/rider-jobs/active-rider, order status/controls/assign-rider/
reject/rate/verify-payment/payment-status/rider-location/delete, voice-order + voice-status,
rider profile/duty-status/location-share (at **both** `/api/rider/*` and `/api/auth/rider/*`),
admin riders + approve/reject/verify/fleet-verify/settle-cash, pending-approvals,
ElevenLabs tool endpoints.

### Confirmed missing (404)

`/api/auth/me/`, `/api/health/`, `/api/branches/`, `/api/admin/branches/`,
`/api/inventory/`, `/api/admin/staff/`, `/api/admin/menu/dishes/`,
`/api/billing/plans/`, `/api/billing/subscription/`, `/api/onboard/*`,
`/api/rider/earnings/`, `/api/auth/rider/earnings/`,
`/api/orders/apply-coupon/`, `/api/menu/apply-coupon/`,
`/api/auth/phone-otp/`, `/api/auth/phone-verify/`.

## Corrections to what was written in earlier docs

1. **Wrong:** "profile is `/api/auth/me/`". It is `/api/profile/` (alias `/api/auth/profile/`).
2. **Wrong:** "rider routes are only under `/api/auth/rider/*`". Both prefixes are
   mounted; use the short `/api/rider/*`.
3. **Wrong:** "`POST /api/menu/apply-coupon/` returns 400 on invalid code" — that
   path does not exist here (404). Coupons are not deployed.
4. **Wrong:** "`/api/auth/rider/earnings/` passes 200" — 404 today. The rider
   earnings screen still has no backend.
5. **Wrong/premature:** branches, inventory, billing, onboarding, admin menu and
   `/api/health/` were listed as live. None respond on this host.
6. **Still correct:** order status vocabulary is
   `pending → confirmed → kitchen → packed → onway → delivered`, and empty `items`
   on order create is rejected.

The earlier "25/25 PASS" smoke test was presumably run against a local Docker
build, not this Railway deployment.
