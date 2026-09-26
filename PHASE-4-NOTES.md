# Phase 4 — Admin: Auth, Order Board + At-Risk, Zone Pause, Products, Runners

## Completed

- **Supabase Auth for staff**, via `@supabase/ssr`'s cookie-based session
  model — `lib/db/server.ts` (Server Components/Route Handlers, RLS as the
  signed-in user), `lib/db/browser.ts` (Client Components), `proxy.ts`
  (this Next.js version renamed `middleware.ts` → `proxy.ts`; see
  AGENTS.md) refreshes the session cookie on every `/admin/*` request.
  `lib/auth/guards.ts` (`requireStaffSession`, for pages) and
  `lib/auth/api-guard.ts` (`requireStaffApi`, for Route Handlers) both
  check the same thing `is_staff()` checks in RLS: an active `app_users` row
  with role `ADMIN` or `OPS` — a runner or partner account hitting `/admin`
  gets signed out and bounced to login, not silently let through.
- **A real route-group restructure**, not just a new folder: the admin
  pages were rendering *inside the marketing site's Header/Footer* at
  first (`app/layout.tsx` wrapped every route, admin included). Fixed by
  giving marketing and admin **separate root layouts** — `app/(marketing)/`
  (existing Header/Footer, existing pages, unchanged behavior) and
  `app/(admin)/layout.tsx` (its own `<html>`/`<body>`, no site chrome) —
  the documented "multiple root layouts via route groups" pattern. Caught
  by actually looking at a screenshot, not just a passing build.
- **`orders_at_risk`** (migration 0010) — a SQL view, not a status column,
  per §4.5's "the ops board derives an at_risk view from it — a view, not a
  status." Flags: `AWAITING_RUNNER` past `accept_deadline_at`, `ASSIGNED`
  15+ minutes with no pickup, `OUT_FOR_DELIVERY` with a stale or absent
  runner heartbeat, `OUT_FOR_DELIVERY` past `promised_eta_max_at`. Honest
  about what it can't see yet: `device_last_seen_at` is always NULL until
  Phase 6's runner heartbeat exists, so every `OUT_FOR_DELIVERY` order
  reads as at-risk right now — correct given there's genuinely no liveness
  signal for it yet, not a false negative to explain away.
- **Migration 0011** adds `orders` to the `supabase_realtime` publication —
  without it the board's subscription would silently receive nothing, in
  every environment, not just local dev. Easy to miss, so it's called out
  by name here.
- **`/admin/orders`** — live board, Supabase Realtime subscription on
  `orders` (the one place in this app that's true to §3's "Realtime for
  authenticated staff only"), at-risk banner (polled every 15s — inherently
  time-based, nothing writes to `orders` at the instant a heartbeat goes
  stale, so there's no row-change event to hang a subscription off for
  that part), and an OPS-cancel action.
- **`lib/orders/cancel.ts`** — the OPS cancellation cause from §5's "six
  causes with different money outcomes": cancels the order, and if there
  was a captured payment, issues a full refund through the same
  `PaymentProvider.refund()` interface Phase 5's real PayPal will use,
  recording a `refunds` row (actor attributed) and letting the existing
  `sync_order_refund_total` trigger (0004_payments.sql) keep
  `amount_refunded_cents` in step.
- **`/admin/zones`** — open/pause/close, with a required reason on pause,
  audited to `audit_log`. No transition guard (unlike order status,
  `service_status` isn't one of `lib/orders/state.ts`'s three tracks — any
  status can move to any other at ops' direction).
- **`/admin/products`** — price and active-flag edits, audited. The one
  sanctioned place a price literal enters the system, and it's staff-only.
- **`/admin/runners`** — roster list + creation. Creating a runner makes a
  **real Supabase Auth user** via the service-role admin API (no invite
  email — no Resend account yet, Phase 5) and returns a one-time temporary
  password for staff to relay out of band. Shift start/stop and offers are
  Phase 6's runner app, not this page's job.

## Tested

Everything below was driven in a real browser (Playwright, 1280px — admin
is desktop-first, per §3/§21) against the real local database:

- **Unauthenticated visit to `/admin/orders` redirects to `/admin/login`.**
- **Sign-in → orders/zones/products/runners all render without marketing
  chrome** (confirms the route-group fix actually worked, not just that
  the build passed).
- **Zone pause round trip**: OPEN → PAUSED (with a reason prompt) → CLOSED,
  each persisted and reflected immediately.
- **Product price edit round trip**: changed Classic Coco's price, reloaded
  the page, confirmed the new price came back from the database (not just
  optimistic UI), reverted.
- **Runner creation**: created a real auth user + `app_users` + `runners`
  row through the UI, confirmed all three exist correctly joined in the
  database, including the role (`RUNNER`) and shift status (`OFF_SHIFT`).
- **Realtime, both directions, no reload**: with the admin board already
  open, placed and captured a real order via the API from *outside* the
  browser session. Watched the row appear from the `INSERT` event
  (~instant), then watched it update in place from `Order placed`/`UNPAID`
  to `Looking for a runner`/`CAPTURED` from the `UPDATE` event fired by
  capture — confirmed both transitions arrive via the subscription, timed
  at under a second apart, with zero page reloads.
- **Cancel-with-refund**: cancelled a captured order from the board,
  confirmed in the database that `payment_status` moved `CAPTURED` →
  `REFUNDED`, a `refunds` row exists with the ops reason and actor, and
  `amount_refunded_cents` matches `amount_captured_cents` exactly (the
  trigger, not application code, keeping that number honest).
- `npm run build` green (26 routes). `tsc --noEmit` clean. `eslint` clean.

### Local-only test state (not committed)

A local test `ADMIN` account (`admin@example.com`) was created directly via
the Supabase Auth admin API + an `app_users` insert — **not** via
`supabase/seed/jamaica.sql`, since a real admin account has no business
being a hardcoded seed row (that's exactly the kind of default credential
that gets forgotten and shipped to production). The same "open the zone,
add stock, add an available runner" local-only steps from Phases 2–3 were
used to exercise the realtime/order flow, then reverted — confirmed the
seed's zone reports `CLOSED` again afterward. Test orders, the temporary
runner, and the audit-log rows from testing were deleted; the local admin
account was left in place for future phases' testing convenience, same as
this phase's own README instructions would tell a new session to do.

## Known gaps

- **No formal automated test suite still** (same running note as Phases 2
  and 3).
- **`orders_at_risk`'s `RUNNER_SIGNAL_STALE` case can't be meaningfully
  false right now** — Phase 6 hasn't shipped the heartbeat endpoint, so
  every `OUT_FOR_DELIVERY` order is at-risk by that rule alone until it
  exists. Not a bug, just worth remembering when Phase 6 lands and this
  finally starts discriminating.
- **The at-risk banner polls every 15s rather than pushing** — a
  deliberate choice (see "Completed" above), not an oversight, but it does
  mean a newly-at-risk order can take up to 15s to appear, unlike the
  order list itself which is instant.
- **No order history / filtered views** — the board only shows active
  (non-terminal) orders. A delivered/cancelled order is invisible here
  once it leaves that set; a "history" tab reusing the same query with a
  different status filter is a small addition for whenever it's needed,
  not built now.
- **No partner admin surface** — correctly out of scope; the roadmap
  places partners in Phase 9, not 4.
- **Runner invites have no email** — the temporary password is shown once
  in the UI; Phase 5's Resend integration is the natural place to add a
  real invite email instead.
- **`REVOKE ALL ... FROM PUBLIC` on `orders_at_risk`** is belt-and-braces
  given the view is security-invoker (PG15+ default) and RLS on the
  underlying tables already gates it — documented as such in the migration
  so a future reader doesn't assume the view itself needs its own RLS
  policies (views don't take them).

## Next: Phase 5

Real payments (PayPal), webhooks, refunds, email. `lib/payments/`'s
interface and the capture verifier's four checks are already proven
against the mock provider; Phase 5 implements `lib/payments/paypal.ts`
against the same interface and adds the webhook route `lib/payments/cash.ts`
and `mock.ts` don't need. `lib/orders/cancel.ts`'s refund path already
calls `provider.refund()` generically, so PayPal refunds need no change
there — just a real implementation behind the interface.
