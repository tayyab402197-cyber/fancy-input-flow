# `src/components/auth` — login & signup scenes

Visual scenes for `/login` and `/signup`. Session logic lives in
`src/lib/auth.ts` + `src/hooks/use-session.ts`.

| Flow | Endpoint | Body | Response |
| --- | --- | --- | --- |
| Login | `POST /auth/token/` | `{email, password}` | `{access, refresh}` → `tokens.set()` |
| Signup | `POST /auth/register/` | `{email, password, full_name, phone}` | `{id, email}` then auto-login |
| Refresh | `POST /auth/token/refresh/` | `{refresh}` | `{access}` |
| Current user | `GET /auth/me/` | — | `{id, email, full_name, is_staff, profile}` |
| Logout | `POST /auth/token/blacklist/` | `{refresh}` | 205; then `tokens.clear()` |
| Password reset | `POST /auth/password/reset/`, `POST /auth/password/reset/confirm/` | `{email}` / `{uid, token, new_password}` | 204 |

## Rules

- Field errors from DRF arrive as `ApiError.fields` — render them under the
  matching input (`fields.email?.[0]`).
- Never log or persist the raw password; only tokens go to storage
  (`tokens` helper in `src/lib/api/client.ts`).
- In `session` auth mode the browser must send cookies: Django needs
  `CORS_ALLOW_CREDENTIALS = True`, `CSRF_TRUSTED_ORIGINS`, and
  `SESSION_COOKIE_SAMESITE = "None"` + `Secure` for cross-site previews.
- Redirect after login is handled by the route, not by these components.
