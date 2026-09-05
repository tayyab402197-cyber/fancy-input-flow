# Backend integration index (Django + DRF)

This app is a TanStack Start (React 19 + Vite) frontend. It ships with **local
stub data** so every screen is reviewable, and a **single HTTP door** so a Django
backend can be plugged in without rewriting UI.

## How a backend is injected on this platform

1. **Set two env vars** (Lovable project env / `.env`):

   ```
   VITE_API_BASE_URL=https://api.example.com/api/v1   # no trailing slash
   VITE_API_AUTH_MODE=jwt                             # jwt | session
   ```

   `VITE_*` vars are the only ones readable in browser code
   (`import.meta.env`). Secrets never go here.

2. **All browser traffic goes through `src/lib/api/client.ts`** — the only file
   that calls `fetch()`. It adds `Authorization: Bearer <access>` (SimpleJWT) or
   `X-CSRFToken` + credentials (session mode), and normalises DRF errors into
   `ApiError { status, message, fields }`.

3. **Secret-key work stays server-side.** Anything that needs a private key
   (payment capture, signed uploads, Django admin tokens) goes in a TanStack
   server function (`*.functions.ts` + `*.server.ts`, see
   `src/lib/voice.functions.ts` for the working example) and reads
   `process.env` **inside** the handler. Webhooks from Django land in
   `src/routes/api/public/*` and must verify a signature.

4. **Swap the stubs.** Each `src/lib/*.ts` module is a stub with the exact
   Django endpoint + serializer shape documented in its header. Replace the
   function body with an `api.get/post/patch` call — components never change.

## Django checklist

- `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`
- `CORS_ALLOWED_ORIGINS` = preview + published Lovable URLs;
  `CORS_ALLOW_CREDENTIALS = True` only for session mode
- Pagination: `PageNumberPagination` → `{count, next, previous, results}`
- Errors: `{"detail": "..."}` or `{"field": ["msg"]}`
- Timestamps: ISO-8601 UTC; money: integer/decimal in PKR

## Section guides

| Section | Guide |
| --- | --- |
| HTTP client, auth, error shape | [`src/lib/api/README.md`](src/lib/api/README.md) |
| Domain stubs (orders, cart, caddy, menu, admin) | [`src/lib/README.md`](src/lib/README.md) |
| Customer profile, banner, caddy card | [`src/components/profile/README.md`](src/components/profile/README.md) |
| Storefront (menu, dish, cart, tracking) | [`src/components/kennedy/README.md`](src/components/kennedy/README.md) |
| Admin console | [`src/components/admin/README.md`](src/components/admin/README.md) |
| Auth screens | [`src/components/auth/README.md`](src/components/auth/README.md) |
| Route → endpoint map | [`src/routes/README.api.md`](src/routes/README.api.md) |
| Hooks (session, device) | [`src/hooks/README.md`](src/hooks/README.md) |

## Agent guide — attaching the Django backend (do this in order)

1. **Point the app at Django.** Set `VITE_API_BASE_URL=https://api.example.com/api/v1`
   (no trailing slash). Nothing else in the frontend hardcodes a host.
2. **Wire auth once.** `src/lib/api/client.ts` owns the token header, refresh and
   error shape. Do not add `fetch()` calls in components or routes.
3. **Replace stubs, not UI.** Work module by module in `src/lib/*.ts`
   (`menu`, `cart`, `orders`, `account`, `caddy`, `tracking`, `admin-store`).
   Keep every exported function name, argument list and return shape — the
   README header in each folder documents the exact serializer fields.
4. **Streams last.** `src/hooks/use-order-tracking.ts` polls
   `GET /orders/{code}/tracking/`; swap the interval for Django Channels
   (`ws/orders/{code}/`) only after REST works.
5. **Secrets stay server-side.** Anything with a private key goes through a
   server function (`*.functions.ts` + `*.server.ts`) reading `process.env`
   inside the handler. Django-originated webhooks land in
   `src/routes/api/public/*` and must verify a signature.
6. **Definition of done per section:** the section's README table has no
   "local stub" rows left, the UI renders unchanged, and demo/simulation
   fallbacks (demo delivery, local cart) still work when the API is offline.
