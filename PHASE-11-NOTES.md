# Phase 11 — Multi-Beach Expansion

## The honest headline

§25's roadmap table describes this phase as "config only, no rewrite" —
and `supabase/seed/jamaica.sql`'s own header comment has claimed exactly
that since Phase 2: "opening a second beach, or a second country, is an
INSERT and never a migration." This phase is the proof, not a promise:
a real second beach (Walter Fletcher Beach, Montego Bay — a real, public,
lifeguarded beach on the same Hip Strip as Doctor's Cave, not a
placeholder name) was added as a seed INSERT with its own prep point and
delivery zone, and every admin/dispatch/customer surface was exercised
against it live. One real bug turned up; everything else already
generalized correctly, which is worth stating plainly rather than
assuming — the claim was tested, not taken on faith.

## Completed

- **`supabase/seed/jamaica.sql`** gained Walter Fletcher Beach: a beach
  row, a prep point, and a delivery zone (same placeholder-boundary,
  same `CLOSED` status, same "confirm vending permission first" caveat as
  Doctor's Cave — §27.1 is unresolved for either beach, not just the
  original one). The existing `inventory` seed statement
  (`prep_points CROSS JOIN products`) picked up the new prep point
  automatically — no seed change needed there, confirming it was already
  written generically.
- **Fixed the one real single-beach hardcode found**: `/admin/map`
  selected its beach with `.eq("slug", "doctors-cave-beach")` — a literal
  left over from Phase 7, when only one beach existed to hardcode. Now
  lists all active beaches and picks the one named by `?beach=<slug>`
  (defaulting to the first), with a beach-switcher matching the pattern
  already used for `/admin/analytics`'s day-window selector — plain
  server-rendered links, no client JS.
- **Everything else already generalized correctly, verified by running
  it, not by reading the code and assuming**:
  - Dispatch (`createOffersForOrder`) already filters candidate runners
    by `home_beach_id = order.beach_id` — built that way since Phase 6,
    before a second beach existed to test it against.
  - `/admin/zones` and `/admin/runners` already list every zone/runner
    with its beach name attached, not scoped to one beach.
  - Zone resolution (`resolveZone`/`zones_covering_point`) already spans
    every active zone regardless of beach — a customer's lat/lng finds
    whichever zone actually covers that point, with no beach selection
    step in the checkout flow at all (correct: the customer picks a
    location, not a beach).
  - Partner `group-orders` (`app/api/v1/partner/group-orders/route.ts`)
    already resolves the delivery zone from `partners.beach_id`.
  - Admin runner/partner creation forms already take a beach picker
    (`BeachOption[]`), not a hardcoded single value.

## Tested

Both zones temporarily opened (as in every prior phase; reverted after):

- **Zone resolution correctly told the two beaches apart by real
  geography**: a lat/lng inside Doctor's Cave's polygon resolved to that
  zone; a lat/lng ~2.5km away inside Walter Fletcher's polygon resolved
  to that one — different zone ids, different beach names, same
  endpoint, no beach parameter involved.
- **Dispatch scoping, the one bug class most worth actually proving**:
  created a second real runner (`WF Test Runner`, `home_beach_id` = Walter
  Fletcher) alongside the existing `Test Runner One` (Doctor's Cave),
  placed one real order at each beach's coordinates, and confirmed via a
  join query that each order's `order_offers` went to exactly the runner
  at its own beach — order #1022 (Doctor's Cave) → `Test Runner One`
  only; order #1023 (Walter Fletcher) → `WF Test Runner` only. No
  cross-beach leakage in either direction.
- **`/admin/map`'s new beach switcher**: confirmed both beach links
  render, each navigates to the correct `?beach=` URL, and the page title
  and schematic radar both reflect the selected beach's own centre point
  and pins — screenshotted both.
- **`/admin/zones` and `/admin/analytics`** both correctly show two rows
  (one per beach's zone) with the right beach name attached to each,
  confirmed via screenshot and via the analytics page's zone-breakdown
  table text.
- **`/admin/runners`** lists the new runner with the correct beach name.
- All test orders/customers deleted afterward; both zones reverted to
  `CLOSED`, inventory to `0`, both runners' `shift_status` to
  `OFF_SHIFT` — re-verified live via `curl /api/v1/zones/resolve` for
  both beaches, both correctly `ZONE_CLOSED` again. Walter Fletcher
  Beach's seed rows themselves (beach/prep point/zone) are the actual
  Phase 11 deliverable and are **not** reverted — they stay, the same way
  Doctor's Cave's seed rows have stayed since Phase 2. `WF Test Runner`
  is kept for the same reason `Test Runner One` has been kept since
  Phase 6: a standing test fixture, not disposable per-run data.
- `npx tsc --noEmit` clean. `npx eslint .` clean. `npx vitest run` —
  19/19 (no new isolable pure logic this phase — this was entirely about
  proving existing logic already generalizes, which needs the database,
  not a unit test). `npm run build` green — 46 routes, unchanged in
  count from Phase 10 (no new routes; `/admin/map` changed shape, not
  count).

## Known gaps

- **§19's SEO city/beach pages** (`/montego-bay`,
  `/montego-bay/doctors-cave-beach`, and by extension a
  `/montego-bay/walter-fletcher-beach`) were never built in any phase —
  not a Phase 11 requirement per §25's roadmap table (which names this
  phase only as the operational/admin model, not new marketing pages),
  and still not built now. Worth flagging since a second beach makes
  these pages more valuable, not less.
- **No per-beach settings** — `walking_speed_mps`, `prep_time_minutes`,
  tax rate, etc. are all global (`settings` has no `beach_id`). Fine for
  two beaches in the same small city with presumably similar conditions;
  would need a real schema change (not "config only") if a future beach
  in, say, a different country needed a different tax rate or currency —
  correctly out of scope for "no rewrite."
- **§27.1 (pilot beach + operating permission) is still open, now for
  two beaches instead of one** — neither zone is open for real traffic.
  This was never going to be resolved by adding a second beach; if
  anything it makes the underlying business question (which beach,
  first) more concrete, not less.
- **No admin UI to draw a zone polygon yet** (§4's Phase 4 zone editor
  was never built as a map-drawing tool — zones are seeded/migrated as
  WKT, not drawn). Both beaches' polygons are still the same kind of
  placeholder rectangle Phase 2 shipped with, not surveyed boundaries.
  Real for one beach or two; unchanged by this phase.

## Roadmap status

Phases 2 through 11 — the full standing roadmap from `docs/ARCHITECTURE.
md` §25 — are now done to the extent each doesn't depend on a
human-only decision still open (§27's numbered list, most centrally
§27.1's pilot beach + permission question, which several phases'
notes have named as the one blocker no amount of further engineering
resolves). Every phase's own notes document precisely what was verified
live versus what remains unverified against a real external service this
sandbox's network policy can't reach (PayPal, Resend, Mapbox, PostHog) —
that distinction has been kept honest throughout rather than claimed away.
