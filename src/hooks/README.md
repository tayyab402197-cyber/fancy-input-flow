# `src/hooks`

| Hook | Purpose | Backend touchpoint |
| --- | --- | --- |
| `use-session.ts` | current local user (`getLocalUser`) | replace with `GET /auth/me/` via TanStack Query; keep the same return shape `{id, email, created_at}` |
| `use-chef-volt.ts` | AI assistant state | calls the server function in `src/lib/voice.functions.ts`; keys stay server-side |
| `use-reduced-motion.ts` | accessibility preference | none |
| `use-mobile.tsx` | viewport breakpoint | none |

## Rules

- Hooks may call `src/lib/*` modules; they must not call `fetch()` directly.
- Anything reading `localStorage` must do so in `useEffect` (or after
  hydration) — reading it during render breaks SSR hydration.
- Auth-dependent data belongs in `useQuery` in a component, never in a public
  route `loader` (SSR/prerender has no token and will 401).

## `use-order-tracking.ts`

`useOrderTracking(order, target?, { onStatusChange })` → `TrackingSnapshot | null`.

Ticks once per second, recomputes the snapshot from `src/lib/tracking.ts` and
mirrors the derived status back into the order store, so profile, notifications
and the owner console stay in sync.

**Django swap:** replace the interval with polling
`GET /api/v1/orders/{code}/tracking/` (or subscribe to
`/ws/orders/{code}/tracking/` via Channels) and `setSnapshot(response)`. The
returned shape and every consumer stay unchanged.
