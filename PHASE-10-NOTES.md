# Phase 10 — Analytics Dashboards, Pilot Hardening

## The honest headline

§27.1 — **pilot beach + operating permission — is explicitly named in the
architecture doc as blocking Phase 10** ("*Blocks Phase 10; shapes Phase 2
seed data.*"). That's still true and still outside this codebase's
control: nothing here opens the seed zone for real, `delivery_zones.
service_status` stays `CLOSED` as committed. Everything below is the
Phase 10 work that doesn't depend on that answer — real analytics over
real order data, and two concrete hardening gaps closed — tested by
temporarily opening the zone the same way every prior phase has, then
reverting and re-verifying `CLOSED` afterward.

## Completed

- **`/admin/analytics`** — operational metrics computed from `orders` +
  `order_assignments`, read via `serverClient()` under the existing
  `staff_all_orders`/`staff_all_assignments`/`staff_all_zones` policies (no
  new RLS needed — staff already had full read access to everything this
  page touches). A day-window selector (7/14/30/90) via `?days=`, plain
  server-rendered links, no client JS. Deliberately **not** a PostHog
  funnel view — §18's funnel (`visit → … → delivered`) is real but lives
  entirely in PostHog, an external no-op sink in this sandbox (§22) whose
  data never lands anywhere this codebase can query, live or otherwise.
  What's queryable and real is operational data already sitting on
  `orders`: placed/delivered/cancelled timestamps, the promised ETA
  window, the accept deadline. Metrics shown:
  - Orders placed, revenue (paid orders only), average order value.
  - Cancellation rate + a reasons breakdown (grouped by
    `cancellation_reason`).
  - On-time delivery rate — `delivered_at <= promised_eta_max_at`, among
    delivered orders that have both timestamps.
  - Average time-to-accept — `MIN(order_assignments.assigned_at) -
    orders.placed_at`, the real dispatch-latency number the pilot needs
    to know if the accept window (`acceptWindowMinutes`) is set sanely.
  - Fulfillment status breakdown, orders-by-day, orders-by-zone (the last
    one trivial with one seeded zone today, real infrastructure for
    Phase 11's multi-beach expansion).
- **Rate limiting on `/quote` and `/orders`**, closing a real gap: §16
  names `/orders`, `/quote`, `/demand`, `/track` explicitly as needing
  rate limits, but only `/track` (built in Phase 3) actually had one.
  `/demand` had the honeypot/dwell/origin checks (§16) but no rate limit
  either. All three now use the same `lib/security/rate-limit.ts` sliding
  window from Phase 3: `/orders` at 10/min/IP (an idempotency-keyed
  double-tap retry is a handful of requests, not tens), `/quote` at
  60/min/IP (generous — re-quoting on every cart edit is normal traffic),
  `/demand` at 10/min/IP returning the same vague `{ok:true}` on trip as
  every other failure mode there, so a bot still learns nothing about
  which check stopped it. All three verified live: burst-tested past each
  limit, confirmed the exact request the limit should reject actually
  gets `429` (or vague `200` for `/demand`), not one before or after.
- **A scheduled sweep** (`POST /api/v1/system/sweep`, `Bearer
  $CRON_SECRET`, wired to `vercel.json`'s cron entry at `*/5 * * * *`),
  closing two gaps both already flagged by name as "a reasonable Phase 10
  addition" in earlier phase notes:
  1. **Promotes scheduled group orders** (§9) once `scheduled_for`
     arrives — `promote_scheduled_orders()` (migration 0020) flips
     `PLACED → AWAITING_RUNNER` the same guarded-update way `createOrder()`
     already does for a dispatchable-now cash order, then the route calls
     `createOffersForOrder()` for each — the DB function can't call
     application code, so that step happens here, immediately after,
     mirroring `createOrder()`'s own two-step exactly.
  2. **Truncates stale exact locations to zone level** (§17) —
     `truncate_stale_order_locations()` (migration 0020) replaces
     `order_locations.point` with its zone's centroid and nulls
     `accuracy_m` for any location tied to an order that resolved
     (delivered **or** cancelled — the doc only names "delivered + 30
     days," but leaving cancellation out would make it a loophole around
     the stated retention policy, so it's treated the same way here) more
     than 30 days ago. `accuracy_m IS NOT NULL` doubles as the "not
     already truncated" marker, so a second sweep run is a genuine no-op,
     not a second write.

## Tested

- **Sweep, both halves, live**: created a real order with a past
  `scheduled_for` sitting at `PLACED`/`CASH_DUE`; ran the sweep; confirmed
  via `psql` it flipped to `AWAITING_RUNNER` with exactly one real
  `order_offers` row created. Separately, inserted a real `order_locations`
  row with an exact point and backdated the order's `delivered_at` to 40
  days ago; ran the sweep; confirmed via `ST_AsText` that the point now
  matches the zone's centroid exactly (not just "changed") and
  `accuracy_m` is `NULL`. Ran the sweep a third time with nothing left to
  do — confirmed `{ordersPromoted: 0, offersCreated: 0,
  locationsTruncated: 0}`, i.e., genuinely idempotent, not silently
  re-processing.
- **Sweep auth**: no header → `401`; wrong secret → `401`; correct
  `Bearer $CRON_SECRET` → runs. `CRON_SECRET` unset entirely means every
  call 401s — fails safe (a late sweep is a delayed promotion/truncation,
  not an open endpoint).
- **Rate limits, live, all three**: burst past each configured limit and
  confirmed the exact boundary — the 11th `/orders` request in a minute
  is the first `429`, the 61st `/quote` request is the first `429`, the
  11th `/demand` request is the first to silently 200 instead of running
  real validation.
- **Analytics dashboard, live, with real varied data**: created five real
  orders via the actual API and backdated/mutated them via `psql` into a
  realistic 3-day spread — one delivered on time, one delivered late, two
  cancelled with different reasons, one left in-progress — then confirmed
  every number on the page by hand against that known input: 5 placed,
  $18.00 revenue (only the two `CASH_COLLECTED` orders), $3.60 average,
  40% cancellation rate, 50% on-time rate (1 of 2 delivered), 4.5 min
  average accept time ((3+6)/2), correct per-day and per-zone breakdowns,
  correct two-row cancellation-reasons table. Also verified the genuine
  empty state (`0` orders, all four tables show "No orders/cancellations
  in this window") separately, since a fresh pilot launch starts there.
  Screenshotted at both 1280px and 390px — no horizontal overflow at
  mobile width, though this page (like the rest of `/admin`) is not
  designed mobile-first; §21's 390px-first requirement is for the
  customer/runner-facing surfaces, not the back office.
- All test data (5 analytics orders + their assignments/items, the sweep
  test order + its location) deleted afterward; zone/inventory/runner
  state reverted to seed-committed values and re-verified via `curl
  /api/v1/zones/resolve` → `"reason":"ZONE_CLOSED"`, matching every prior
  phase's cleanup discipline.
- `npx tsc --noEmit` clean (regenerated `lib/db/types.ts`'s two new RPC
  function entries by hand from a real `supabase gen types` run, rather
  than replacing the whole file, to keep the diff to what actually
  changed). `npx eslint .` clean. `npx vitest run` — 19/19 (no new
  isolable pure logic this phase; the sweep and the dashboard both need
  the database to mean anything). `npm run build` green — 46 routes,
  including `/admin/analytics` and `/api/v1/system/sweep`.

## Known gaps

- **The in-memory rate limiter is single-instance** (already flagged in
  `lib/security/rate-limit.ts` itself since Phase 3) — correct for the
  MVP's single server process, wrong the moment this runs on more than
  one. Swap its internals for a shared store (Upstash/Redis) before any
  multi-instance deploy; using the same module for three more routes this
  phase doesn't change that math, just documents it again since it's more
  load-bearing now.
- **No real alerting on the sweep failing** — if `CRON_SECRET` is
  misconfigured or the sweep 500s, nothing pages anyone; a human would
  notice a scheduled order stuck at `PLACED` well past its time, or
  `orders_at_risk`/the admin board, before this specifically. A pilot
  running unattended for any length of time should have real monitoring
  on this endpoint's response, not just its existence.
- **Analytics dashboard has no CSV/export** and no cross-window
  comparison (this week vs. last week) — a reasonable ask once there's
  enough real pilot data to make a trend worth looking at; premature with
  zero production orders.
- **`vercel.json`'s cron schedule (`*/5 * * * *`) is unverified against a
  real Vercel deployment** — this sandbox has no Vercel project to deploy
  to and confirm the cron actually fires; the endpoint itself is fully
  tested by direct call, matching this whole project's standing pattern
  for anything gated on an external platform this sandbox can't reach.
- **§27.1 remains open** — which beach, and is permission secured. Keeps
  blocking an actual pilot launch; nothing in this phase or the next
  changes that.

## Next: Phase 11

Multi-beach expansion (config only, no rewrite, per §25). The zone/beach
data model, `orders-by-zone` breakdown built this phase, and
`beach_lnglat()`/zone-resolution machinery from Phase 2 already assume
more than one beach can exist — Phase 11 is adding seed rows and
confirming nothing hardcodes "one beach," not new schema.
