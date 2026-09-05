# Route → Django endpoint map

Routing conventions live in `README.md` next to this file. This file lists what
each route needs from the backend.

| Route | Reads | Writes |
| --- | --- | --- |
| `/` | `GET /dishes/`, `GET /categories/`, `GET /promotions/active/` | — |
| `/dish/$slug` | `GET /dishes/{slug}/` | `POST /dishes/{slug}/like/` |
| `/cart` | local cart, `GET /payments/methods/`, `GET /addresses/` | `POST /orders/` |
| `/login`, `/signup` | — | `POST /auth/token/`, `POST /auth/register/` |
| `/profile` | `GET /auth/me/`, `GET /profiles/me/`, `GET /orders/?mine=1`, `GET /caddies/me/assigned/`, `GET /orders/{id}/caddy/location/` | `PATCH /profiles/me/`, `POST /addresses/`, `POST /orders/{id}/caddy/rate/` |
| `/rider`, `/rider/jobs`, `/rider/earnings`, `/rider/profile` | `GET /caddies/me/`, `GET /caddies/me/jobs/`, `GET /caddies/me/earnings/?range=` | `PATCH /orders/{id}/status/`, `POST /caddies/me/location/` |
| `/admin/*` | see `src/components/admin/README.md` | idem |
| `/api/public/*` (add as needed) | inbound from Django/webhooks | must verify a signature |

## Conventions

- Fetch with TanStack Query in the component (`useQuery` / `useMutation`) and
  invalidate with `queryClient.invalidateQueries({ queryKey: [...] })`.
- Loaders may only call **unauthenticated** endpoints — SSR and prerender carry
  no bearer token.
- Every route defines its own `head()` (title, description, og:*).
- New route file → matching `createFileRoute("/path")` string; never edit
  `src/routeTree.gen.ts`.

## Inbound webhooks from Django

Create `src/routes/api/public/<name>.ts`, verify an HMAC header against a
secret read from `process.env` inside the handler, then act. Public URL:
`https://project--<id>.lovable.app/api/public/<name>`.
