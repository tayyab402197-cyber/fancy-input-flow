# `src/components/admin` — operations console

Shell and primitives for `/admin/*`. State currently lives in
`src/lib/admin-store.ts` (localStorage).

| Screen | Endpoint | Notes |
| --- | --- | --- |
| `/admin` dashboard | `GET /admin/metrics/?range=today` | `{orders, revenue, avg_ticket, active_caddies, late_orders}` |
| `/admin/orders` | `GET /admin/orders/?status=&q=&page=` | DRF pagination |
| `/admin/orders/$id` | `GET /admin/orders/{id}/`, `PATCH /admin/orders/{id}/` `{status}` | status ∈ `confirmed\|cooking\|picking\|onway\|delivered\|cancelled` |
| assign caddy | `POST /admin/orders/{id}/assign/` `{caddy_id}` | 409 if caddy busy |
| `/admin/riders` (caddies) | `GET /admin/caddies/`, `PATCH /admin/caddies/{id}/` `{is_active}` | |
| `/admin/customers` | `GET /admin/customers/?q=` | never return password hashes or raw tokens |
| `/admin/payments` | `GET /admin/payments/?from=&to=`, `POST /admin/payments/{id}/refund/` | refund must be idempotent |

## Security

- Every `/admin/*` endpoint requires `IsAdminUser` (or a
  `has_role(user, "admin")` check) **server-side**. The client-side guard in
  `src/lib/auth-guard.ts` is UX only and must never be the sole gate.
- Do not ship an admin flag in localStorage as proof of privilege — always
  re-verify with `GET /auth/me/`.
- Destructive actions (refund, cancel, delete) need a confirm dialog and an
  audit row on the Django side (`who`, `what`, `when`).

## Real-time

Order board refresh: poll `GET /admin/orders/?updated_since=<iso>` every 10 s, or
subscribe to a Channels group `admin.orders`.
