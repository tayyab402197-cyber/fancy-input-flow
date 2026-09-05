# `src/lib/api` — the only door to Django

## Files

- `client.ts` — `api.get/post/patch/del`, `tokens`, `ApiError`,
  `isBackendConfigured()`, `API_BASE_URL`, `AUTH_MODE`.
- `endpoints.ts` — the canonical endpoint list (paths only, no fetch logic).
- `backend-guide.ts` — human-readable notes surfaced in the admin console.

## Contract

```
VITE_API_BASE_URL   https://api.example.com/api/v1   (no trailing slash)
VITE_API_AUTH_MODE  jwt (SimpleJWT, default) | session (cookie + CSRF)
```

Until `VITE_API_BASE_URL` is set, `isBackendConfigured()` is `false` and every
feature falls back to the local stub. No screen breaks.

### Auth

| Action | Endpoint | Body | Response |
| --- | --- | --- | --- |
| Login | `POST /auth/token/` | `{username\|email, password}` | `{access, refresh}` |
| Refresh | `POST /auth/token/refresh/` | `{refresh}` | `{access}` |
| Signup | `POST /auth/register/` | `{email, password, full_name, phone}` | `{id, email}` |
| Me | `GET /auth/me/` | — | user + profile |

Store tokens with `tokens.set(access, refresh)`; clear on logout with
`tokens.clear()`.

### Errors

Every non-2xx becomes `ApiError`:

```ts
try { await api.post("/orders/", body); }
catch (e) { if (e instanceof ApiError) { e.status; e.message; e.fields.phone?.[0]; } }
```

DRF `{"detail": ...}` → `message`; `{"field": ["..."]}` → `fields`.

### Adding an endpoint

1. Add the path to `endpoints.ts`.
2. Call it from the matching `src/lib/<domain>.ts` stub — never from a component.
3. Wrap the call in TanStack Query (`useQuery` / `useMutation`) in the route.

### Do not

- Call `fetch()` in a component.
- Put a secret in a `VITE_*` var — use a server function + `process.env`.
- Call the API from a public route `loader` that requires auth (SSR has no token);
  fetch in the component with `useQuery`.
