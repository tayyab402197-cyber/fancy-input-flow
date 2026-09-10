# Live API Test Results — Kennedy Backend (Sep 10 2026)

Source: user-run live smoke test against
`https://overflowing-essence-production-6d94.up.railway.app/api`

**Total: 25 · PASS: 25 · FAIL: 0**

| Endpoint | Status | Result |
|---|---|---|
| GET `/api/health/` | 200 | PASS |
| GET `/api/docs/` (html) | 200 | PASS |
| GET `/api/schema/` | 200 | PASS |
| POST `/api/auth/login/` (admin) | 200 | PASS |
| POST `/api/auth/login/` (rider_hamza) | 200 | PASS |
| GET `/api/auth/me/` | 200 | PASS |
| GET `/api/billing/plans/` | 200 | PASS |
| GET `/api/branches/` | 200 | PASS |
| GET `/api/menu/dishes/` | 200 | PASS |
| GET `/api/menu/categories/` | 200 | PASS |
| GET `/api/menu/book/` | 200 | PASS |
| POST `/api/orders/` (multi-item, authenticated) | 201 | PASS |
| POST `/api/orders/` empty items → 400 | 400 | PASS |
| PATCH `/api/orders/221/status/` → `kitchen` | 200 | PASS |
| GET `/api/orders/` | 200 | PASS |
| POST `/api/orders/voice-order/` (voice secret) | 201 | PASS |
| POST `/api/auth/phone-otp/` | 200 | PASS |
| GET `/api/favourites/` | 200 | PASS |
| GET `/api/inventory/` | 200 | PASS |
| GET `/api/admin/riders/` | 200 | PASS |
| GET `/api/admin/branches/` | 200 | PASS |
| POST `/api/menu/apply-coupon/` invalid → 400/404 | 400 | PASS |
| GET `/api/auth/rider/profile/` | 200 | PASS |
| POST `/api/auth/rider/duty-status/` | 200 | PASS |
| GET `/api/auth/rider/earnings/` | 200 | PASS |

## Corrections to `docs/BACKEND_API_REFERENCE.md`

This live run supersedes earlier path guesses. Confirmed real paths:

- Profile/me is `/api/auth/me/` (earlier doc used `/api/profile/`).
- Rider routes are namespaced under auth:
  `/api/auth/rider/profile/`, `/api/auth/rider/duty-status/`,
  `/api/auth/rider/earnings/` — **not** `/api/rider/*`.
- Coupons: `POST /api/menu/apply-coupon/` (returns 400 on invalid code).
- Extra live endpoints not in the earlier table:
  `GET /api/menu/book/`, `GET /api/favourites/`, `GET /api/inventory/`,
  `GET /api/orders/` (list), `POST /api/orders/voice-order/` (shared voice secret).
- Order status vocabulary confirmed: PATCH to `kitchen` succeeds, so the
  frontend `cooking`/`picking` wording still needs the mapping layer (plan A1).
- `POST /api/orders/` with empty `items` correctly returns 400 — checkout must
  guard against sending an empty cart.
