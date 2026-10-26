# Phase 2 — Schema, Zones, Catalogue, Analytics

## Completed

- **All 7 written migrations applied to a real database** (local Supabase,
  Postgres 17 + PostGIS via `npx supabase start`) for the first time —
  previously written but never run. Two more added for Phase 2's own
  deliverable:
  - `20260921000008_zone_resolution.sql` — `zones_covering_point` /
    `zones_near_point`, the `ST_Covers` / `ST_DWithin` SQL functions the
    point-in-polygon half of §9's serviceability gate needs.
  - `20260921000009_eta_distance.sql` — `nearest_prep_point_distance_m`,
    the travel-distance input to the §7 ETA formula.
- **`supabase/seed/jamaica.sql` applied and re-run to confirm idempotency**
  (`ON CONFLICT DO NOTHING` throughout — second run inserted zero rows).
- **`lib/db/types.ts` generated from the live schema** (`supabase gen types
  typescript --local`), not hand-written — it will drift-check against real
  migrations from here on.
- **`lib/db/client.ts`** — `serviceClient()` (service-role, server-only) vs.
  `anonClient()` (RLS-scoped, safe in Server Components), matching §16.
- **`lib/geo/zones.ts` + `lib/pricing/serviceability.ts` + `lib/pricing/eta.ts`**
  — the full §7 gate: zone containment → `service_status` → operating hours
  (computed in the beach's own timezone) → ≥1 `AVAILABLE` runner → inventory
  `qty_available > 0`, then the ETA formula, clamped to the zone's configured
  bounds.
- **`POST /api/v1/zones/resolve`** (§13) — real endpoint, wired to the above.
- **`POST /api/v1/demand`** — out-of-zone / not-serviceable-yet capture into
  `zone_demand_requests`, with the §16 anti-abuse trio (honeypot, dwell-time
  floor, origin check), all failing identically so a bot learns nothing.
- **`lib/db/queries/catalogue.ts`** — `getActiveProducts()`, the real
  Postgres-backed replacement for `lib/marketing-menu.ts` display copy. Not
  yet wired into a page (there's no cart to add to until Phase 3) but ready
  for it.
- **`lib/settings.ts`** — typed reader over the `settings` table, with the
  same conservative defaults as the seed (tax stays 0 unless the DB says
  otherwise).
- **`lib/analytics/events.ts`** — hand-rolled PostHog `capture` call over a
  bare `fetch`, not the `posthog-js` SDK (~50KB gzipped saved). No-ops
  completely with `NEXT_PUBLIC_POSTHOG_KEY` unset, which is the honest state
  right now (§22 — no PostHog account). Instruments the two funnel drop-offs
  §18 calls out by name: `location_denied` and `out_of_zone` /
  `not_serviceable` (with reason).
- **`/order` is now real**, not the Phase 1 placeholder: one-shot
  `getCurrentPosition` → `/api/v1/zones/resolve` → an honest result for
  every case (out of zone, borderline/low-accuracy, in-zone-but-closed with
  the actual reason, or serviceable with fee + ETA). It still does **not**
  claim checkout works — Phase 3 isn't built, and the serviceable branch says
  so explicitly rather than leading into a dead end.

## Tested

- **§33 constraint verification**, run against the applied schema inside a
  rolled-back transaction (script kept at the end of this phase's work,
  not committed — one-off verification, not a fixture): negative
  `order_items.qty` rejected, negative `inventory.qty_available` rejected,
  inverted zone ETA bounds rejected, **duplicate active
  `order_assignments` on one order rejected** (the dispatch-race guard),
  **duplicate `payments.provider_capture_id` rejected** (the double-capture
  guard), over-refund beyond `amount_captured_cents` rejected,
  `CANCELLED` without `cancelled_by`/`cancelled_at` rejected, and
  `order_events` confirmed populated by trigger on both insert and every
  tracked-column transition — never by application code.
- **PostGIS**: `ST_Covers` confirmed true inside the seeded polygon, false
  ~9km outside it, and the borderline `ST_DWithin(..., 75)` band confirmed
  true just outside the boundary — exercising the exact §9 "20m GPS error
  shouldn't lose a sale" case.
- **RLS via the live REST API** with the anon key: `products` readable
  (public catalogue), `orders` and `prep_points` both return empty — not
  because they're empty, `prep_points` has a seeded row — but because RLS
  denies anon access to operational data, as designed.
- **`/api/v1/zones/resolve` exercised end to end** through the real Next.js
  route (not just the underlying SQL) for all four outcomes: out-of-zone,
  borderline, in-zone-but-`ZONE_CLOSED` (today's actual state), and bad
  input (400). Response shapes match what `LocationGate.tsx` expects.
- **`/api/v1/demand` exercised end to end**, including the anti-abuse paths.
  Found and fixed a real bug here: the route reused a single `NextResponse`
  object as a shared "vague success" constant across requests — but a
  `NextResponse` body is a one-shot stream, so only the *first* rejected
  request in the process got a real body; every one after it got an empty
  response. Confirmed empty-body on the second call, fixed by constructing a
  fresh `NextResponse.json(...)` per call, confirmed three consecutive
  rejected calls all now return `{"ok":true}` and none of them inserted a
  row.
- **Driven by hand in a real browser (Playwright, Chromium) at 390×844**
  with mocked geolocation: idle → tap "Use my location" → resolves against
  the live local database → renders the honest "isn't open right now, here's
  why, leave your email" state. Screenshots taken at both steps. Browser
  console clean except the expected dev-mode `[analytics no-op]` debug
  lines and Next's own HMR/DevTools notices.
- `npm run build` green (10 routes; `/order` still prerenders static — the
  location logic is entirely client-side, the page itself fetches nothing
  server-side). `tsc --noEmit` clean. `eslint` clean — caught and fixed a
  real React-purity violation (`Date.now()` called directly in a `useRef`
  initializer during render) along the way.

## Known gaps

- **No real Supabase project linked** — everything above runs against local
  Supabase (`npx supabase start`, Postgres 17 + PostGIS in Docker). Prod
  linking (`npx supabase link` + `db push`) is genuinely pending an account;
  the migrations are now proven to apply cleanly, which was the actual risk.
- **This sandbox's Docker daemon needed an explicit proxy env var
  (`HTTP_PROXY`/`HTTPS_PROXY` pointed at the agent proxy before `dockerd`
  starts) to pull images at all** — direct pulls to `public.ecr.aws` /
  CloudFront were rejected outright. Irrelevant on a normal dev machine or
  in CI, but worth knowing if a future session in this same environment
  finds `supabase start` failing on image pulls again.
- **No formal automated test suite yet** (§24: Vitest/Playwright). Everything
  in "Tested" above was run by hand this phase, not left as CI-checked
  fixtures. Given the size of the remaining roadmap (Phases 3–11), spinning
  up the full harness now vs. after more of the order flow exists was a
  judgment call — deferred, not forgotten. `playwright` is already a
  devDependency for when it lands.
- **`getActiveProducts()` has no caller yet** — there's nothing to add a
  product to until Phase 3's cart exists. Verified via the equivalent direct
  REST call (same table, same RLS policy) and `tsc`, not via its own test.
- **Funnel events not yet instrumented**: `get_coco_click` (would need a
  shared `<Button>` change to carry `onClick` through its `<Link>` path —
  deferred as low-value against the size of what's left),
  `checkout_started`/`payment_succeeded`/`delivered` (Phase 3/5 — the flows
  don't exist yet). `location_denied` and `out_of_zone`/`not_serviceable`
  — the two §18 calls out by name as worth watching — are live.
- **Mapbox, PostHog**: no accounts, as expected per §22/blockers. Zone
  resolution needs neither (pure PostGIS); both stay no-op/placeholder.
- The seed's zone stays `CLOSED` and inventory stays `0` on purpose (no
  vending permission yet, §27.1) — meaning **today, every real location on
  the pilot beach honestly reports "not open right now"**, which is
  correct, not a bug. Verified in the browser test above.

## Next: Phase 3

Cart, quote, checkout, order creation, confirmation, guest tracking (mock
payment). `getActiveProducts()` and `lib/settings.ts` are ready inputs to
`lib/pricing/quote.ts`. The `orders` schema, idempotency key, and
`order_events` trigger are already proven; Phase 3 is mostly application
code over verified ground.
