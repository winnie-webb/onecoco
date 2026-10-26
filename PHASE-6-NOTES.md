# Phase 6 — Runner PWA: Login, Shift, Offers, Accept, Status, Delivery Code, Cash

## Completed

- **Runner auth** — `lib/auth/runner-guards.ts` (`requireRunnerSession` for
  pages, `requireRunnerApi` for Route Handlers), same Supabase Auth /
  `app_users` model as staff, gated to role `RUNNER`. `proxy.ts`'s matcher
  extended to `/runner/:path*` alongside `/admin/:path*`.
- **A third root layout**, `app/(runner)/layout.tsx` — no marketing chrome,
  same reasoning as `(admin)`'s split in Phase 4, this time mobile-first by
  default rather than desktop-first (§21: a runner is on a phone, on a
  beach).
- **`accept_order_offer`** (migration 0012) — §6's dispatch race, actually
  settled by the database. Locks the runner row, checks the concurrency
  cap under that lock, then the race-safe
  `INSERT ... ON CONFLICT (order_id) WHERE released_at IS NULL DO NOTHING`.
  Returns a typed enum (`ACCEPTED`, `LOST_RACE`, `RUNNER_AT_CAPACITY`, …)
  rather than a generic error, so the API layer can give an honest,
  specific message instead of "something went wrong."
- **`lib/dispatch/offers.ts`** — `createOffersForOrder`, called the moment
  an order becomes dispatchable (both the mock/PayPal capture-success path
  and the cash order-creation path now call it), per §6 step 1.
- **`lib/orders/runner-transition.ts`** — the runner-facing state machine:
  `PICKED_UP` (folds prep straight to `READY` — this MVP has no separate
  prep-station role, the runner IS the one who preps and delivers, per §1's
  "One Coco operates it"), `ARRIVING` (an event, no status change — §4.3),
  `DELIVERED` (checks the customer-supplied delivery code against
  `orders.delivery_code`, settles cash into `shift_cash` when the order was
  `CASH_DUE`), `UNDELIVERABLE` (leaves the assignment active — resolving it
  is ops' call, not the runner's, per §5's four `undeliverable_resolution`
  values).
- **`GET /runner/offers`, `POST /runner/offers/:id/accept`,
  `POST /runner/orders/:id/transition`, `POST /runner/heartbeat`,
  `POST /runner/shift/{start,end}`** — all wired to the above.
- **Frontend**: `/runner/login`, `/runner/today` (shift toggle + assigned
  deliveries, heartbeat pinging only while on shift), `/runner/offers`
  (Realtime-subscribed to `order_offers`, filtered to this runner by RLS —
  §3 names "runner offers" explicitly as the other authenticated-staff
  Realtime surface, alongside the admin board), `/runner/order/[id]`
  (picked up → arriving → delivered-with-code, or "I can't find them").

## A real bug, found by actually running it

The offers page came back **empty** the first time it was tested end to
end, even though the `order_offers` row existed correctly in the database.
Root cause: `runner_assigned_orders` (0007_rls.sql, Phase 0) only lets a
runner read an order they already have an **active assignment** for — but
the offers list embeds `orders(...)` for offers **not yet accepted**.
PostgREST's embedded-resource join behaves like an inner join, so when RLS
silently blocked the nested `orders` row, the *entire* `order_offers` row
vanished from the response. Not an error anywhere — just an empty list,
which looks exactly like "no offers right now" until you check the
database directly and see the row is really there.

Fixed with a new policy, migration 0014,
`runner_offered_orders`: a runner can read an order's basic fields if they
hold *any* offer for it (open or resolved), not just an assignment. This is
the second cross-cutting RLS gap this phase's actual testing has caught
(Phase 4 also went in expecting the marketing Header/Footer bug and instead
found a genuinely different one) — worth internalizing as a pattern: **RLS
policies that were correct for one query shape can silently break a
different embedded-join shape against the same table**, and the failure
mode is "empty result," not an exception, so it only surfaces by looking at
a screenshot or the actual response, never by a passing build.

## Tested

Everything below was driven through the real UI (Playwright, 390×844 — the
runner is mobile-first) against the real local database, zone temporarily
opened as in prior phases (reverted after):

- **Full delivery, cash order, start to finish**: signed in as a real
  runner account → started shift → a cash order was placed via the API
  (separate from the browser session) → the offer appeared on
  `/runner/offers` via the Realtime subscription (no reload) → accepted →
  order appeared on `/runner/today` → picked up → arriving → entered the
  **real** delivery code (fetched from the database to simulate "the
  customer told me") → confirmed delivered.
- **Verified in the database, not just the UI**: `fulfillment_status =
  DELIVERED`, `payment_status = CASH_COLLECTED`, `cash_collected_cents =
  900` (the order total, correctly), the assignment's `released_at`/
  `release_reason = COMPLETED`/`delivered_occurred_at` (device clock,
  ~150ms ahead of `delivered_recorded_at`, server clock — §12's two-clock
  design working as intended, not just present in the schema), `shift_cash
  .collected_cents` incremented by exactly the order total, and the full
  `order_events` trigger trail for the whole lifecycle: `created` →
  `fulfillment: PLACED→AWAITING_RUNNER` → `fulfillment: AWAITING_RUNNER→
  ASSIGNED` → `prep: NOT_STARTED→IN_PROGRESS` → `prep: IN_PROGRESS→READY` →
  `fulfillment: ASSIGNED→OUT_FOR_DELIVERY` → `fulfillment:
  OUT_FOR_DELIVERY→DELIVERED` → `payment: CASH_DUE→CASH_COLLECTED`.
- **The `orders_at_risk` heartbeat gap from Phase 4 is now closed and
  confirmed, not just theoretically**: queried the view immediately after
  marking an order picked-up (fresh heartbeat from shift start) and got
  **zero** rows for it — proving `RUNNER_SIGNAL_STALE` now genuinely
  discriminates live runners from stale ones, rather than flagging every
  `OUT_FOR_DELIVERY` order by default as Phase 4 honestly noted it would.
- **`UNDELIVERABLE` path**: marked a second order undeliverable with a
  reason, confirmed `fulfillment_status = UNDELIVERABLE`, `contact_attempts`
  incremented, the reason recorded, and — the specific thing worth
  checking — the assignment's `released_at` is still `NULL`: the runner
  isn't automatically freed from an order they couldn't deliver; that's
  ops' decision.
- **The dispatch-race guard itself** was proven at the database level back
  in Phase 2's §33 checklist (duplicate `order_assignments` insert
  rejected); this phase proves the *application* path that guard sits
  behind actually reaches it the same way a second runner tapping Accept
  simultaneously would.
- `npm run build` green (34 routes). `tsc --noEmit` clean. `eslint` clean.
  `npm test` still 19/19 (no new pure-logic surface this phase needed
  isolating — the offer-accept race genuinely needs the database, so it's
  exercised live as above, not mocked).

## Known gaps

- **No formal automated test suite for this phase's flows** (same running
  note). The dispatch race and RLS bug above were both found by hand —
  which is itself the argument for the Vitest-with-a-real-test-database
  investment flagged as a gap since Phase 5, still not done.
- **Push-assignment fallback isn't built** — §6's own note: first-to-tap
  cherry-picking is a known risk with a small runner pool; the schema
  supports either model without migration, but only first-to-tap-wins
  exists today.
- **No concurrent-accept race actually exercised with two real runners
  clicking at once** — the guard is proven at the SQL level (Phase 2) and
  the single-runner path is proven end to end (this phase), but a genuine
  two-browser simultaneous-tap test wasn't run. Worth doing before relying
  on it under real multi-runner load.
- **Offline runner actions** (§12: "the runner app WILL be used with no
  signal") — `occurred_at` vs `recorded_at` exists and is populated
  correctly (verified above), but there's no actual offline queue/retry in
  the client; a request that fails outright today just shows an error, it
  doesn't queue for later.
- **No photo upload wired for `delivery_photo_url`** — the column and the
  transition function both accept it, but the runner UI has no camera/file
  input yet. Small, deferred addition.
- **Push assignment / heartbeat interval (60s) is a guess**, not tuned
  against real battery/accuracy data — reasonable default, flagged as such.

## Next: Phase 7

Runner GPS + live map + proximity dispatch — the deliberately deferred
piece from §1.1. `runners.device_last_seen_at` already exists and is now
genuinely fed by a real heartbeat; Phase 7 adds actual position data
alongside it, with its own staleness handling.
