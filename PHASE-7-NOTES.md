# Phase 7 — Runner GPS + Live Map + Proximity

## The honest headline

**No map tile provider could be reached or tested from this environment —
not just Mapbox.** A direct connectivity check before writing any code:

```
curl https://api.mapbox.com/               → connect_rejected
curl https://tile.openstreetmap.org/...    → connect_rejected
curl https://unpkg.com/leaflet@.../css     → connect_rejected
```

All three rejected outright by this sandbox's egress policy (confirmed via
the agent proxy's own status endpoint as organization denials, same class
as Phase 5's PayPal/Resend finding). This isn't "no Mapbox token" (§22's
anticipated blocker) — it's that no tile-based map, from any provider,
could have been rendered or verified here regardless of which one the
architecture names.

Given that, this phase built everything a live map needs — real GPS
collection, real distance calculation, a real live-position feed — and,
instead of writing an untestable Mapbox GL JS integration, rendered actual
positions on a plain SVG schematic (no tiles, no external host, nothing to
block). That's a real, verified deliverable, clearly labeled as not the
real map the architecture eventually wants once a token and network path
both exist.

## Completed

- **`runner_locations`** (migration 0015) — scoped exactly as §17 requires
  when GPS lands: tied to an `order_assignments` row, not a persistent
  column on `runners`, so it only exists for the lifetime of one active
  delivery. `runner_own_location_insert` (RLS) requires the assignment to
  still be active, matching the same check the API route also makes.
  Deleted the instant that assignment is released (`lib/orders/runner-
  transition.ts`'s `DELIVERED` path) — "short retention" enforced by the
  code that owns the row's lifecycle, not left to a cron job that doesn't
  exist yet.
- **`POST /api/v1/runner/location`** — the write path, gated the same way
  twice (route + RLS).
- **Client GPS collection** (`components/runner/ActiveDelivery.tsx`) —
  `watchPosition`-style polling (a `getCurrentPosition` ping every 15s),
  running ONLY while `fulfillmentStatus === OUT_FOR_DELIVERY`, for that
  one order. Nothing before pickup, nothing after delivery — §1.1's "no
  background geolocation" MVP decision holds; this is additive, not a
  reversal of it.
- **Proximity on the offers list** — a one-shot location (like the
  customer flow, not the persistent tracking above) lets
  `GET /api/v1/runner/offers` return each offer's distance to its prep
  point, reusing `nearest_prep_point_distance_m` from Phase 2 rather than
  inventing new geometry.
- **The admin live map** (`/admin/map`) — real positions, real distances,
  rendered as an SVG "radar" centered on the beach, not a tile map. Polls
  `runner_locations_geo` every 8s. Only shows runners currently on an
  active delivery — an idle `AVAILABLE` runner has zero location rows,
  correctly, per §17.

## Two more real cross-phase bugs, found only by actually running this

Both are the same shape as Phase 6's RLS gap: correct in every check that
ran before, invisible until a genuinely new query shape hit them.

1. **PostgREST returns `geography` as an EWKB hex string, not GeoJSON.**
   `lib/db/queries/admin-map.ts` first assumed `{ coordinates: [lng, lat]
   }` and crashed the map page outright (`Cannot read properties of
   undefined`) the first time it was opened. Every earlier phase either
   wrote geography (WKT text, which Postgres casts on the way in) or read
   it only inside SQL (PostGIS functions), never round-tripped a
   coordinate back out through PostgREST into JS — so this never came up
   until now. Fixed with migration 0016: `beach_lnglat()` (a function) and
   `runner_locations_geo` (a view) both extract `ST_X`/`ST_Y` in SQL and
   return plain floats.
2. **`order_assignments` had RLS enabled since Phase 0 with no staff
   policy at all** — only `runner_own_assignments`. Every earlier admin
   feature happened to read `orders` directly and never needed to join
   through `order_assignments`, so a real, signed-in ADMIN session got
   **zero rows** from a query that returned everything correctly under
   `service_role` — the exact "looks fine until you check the actual
   authenticated response" failure mode Phase 6's notes already flagged as
   worth watching for. Found by testing the live map's query as the real
   admin user via a REST call with a real access token (not just
   service-role), not by reading the migration. Fixed: migration 0017,
   `staff_all_assignments`.

Three RLS/serialization gaps found this way across Phases 6–7 alone is
enough of a pattern to say plainly: **a query that only touches tables via
`service_role` proves nothing about whether it will work for the
authenticated role that will actually run it in production.** Every
admin/runner query from here on should be sanity-checked against a real
signed-in session, the way this phase's debugging finally did, not assumed
from the service-role happy path.

## Tested

All driven against the real local database, zone temporarily opened as in
prior phases (reverted after):

- **Full delivery with GPS**: started a shift, placed a cash order,
  confirmed the offers list showed a real, correct distance ("100m from
  prep point" — an intentionally offset test coordinate), accepted, picked
  up, confirmed a `runner_locations` row landed within 2 seconds of
  pickup.
- **The admin live map showed the real pin**, at the real (schematic)
  position, labeled with the runner's name and order number — verified via
  screenshot, not just a non-empty query.
- **Delivered the order, then confirmed `runner_locations` for that
  assignment dropped to zero rows** — §17's short retention is real
  behavior, not just a comment.
- Both RLS bugs above were each confirmed with a **before/after** REST
  call using a real admin access token — empty array before the fix,
  correct row after, same query, same session.
- `npm run build` green (36 routes). `tsc --noEmit` clean. `eslint` clean.
  `npm test` still 19/19 (no new isolable pure logic this phase — the
  distance/GPS features all need the database or the browser's Geolocation
  API to mean anything, so they're exercised live above rather than
  mocked).

## Known gaps

- **No real Mapbox (or any tile provider) integration** — see the
  headline. The schematic view is deliberately swappable: whenever a token
  and network path exist, `RunnerMap.tsx` is the one component to replace,
  and `getLiveRunnerPins`/`runner_locations_geo` already hand it exactly
  the lng/lat data a real map needs.
- **No actual proximity-based DISPATCH** — offers still go to every
  `AVAILABLE` runner simultaneously (Phase 6's proven, race-safe model,
  left alone deliberately rather than destabilized). "Proximity" this
  phase means showing distance, not routing who gets offered first or when
  — §6's own note that push-assignment is a fallback, not a commitment,
  still holds.
- **Distance-on-offers needs a fresh one-shot permission grant** each time
  the runner opens `/runner/offers` — no caching/reuse of a recent fix
  across page loads. Small, deliberate simplicity choice.
- **No accuracy-based confidence handling on the live map** — a
  low-accuracy runner ping renders the same as a precise one; the
  customer-side flow's "low accuracy, please confirm" treatment (§9) has
  no runner-side/admin-side equivalent yet.
- **Retention is delete-on-delivery only** — an assignment that never
  resolves (stuck `OUT_FOR_DELIVERY` indefinitely, e.g., an abandoned
  runner session) would accumulate `runner_locations` rows with no
  automatic sweep. `orders_at_risk` would flag such an order via
  `RUNNING_LATE` well before this becomes a real privacy concern, but a
  belt-and-braces max-age cleanup job is a reasonable Phase 10 addition,
  not built now.

## Next: Phase 8

Build Your Coco — full personalisation + preview. No external
dependencies; the customization schema (`customization_groups`/`options`)
and pricing (`lib/pricing/quote.ts`) are already fully built and proven
since Phase 3 — this phase is mostly a richer picker UI (live preview of
the personalized coco) over already-verified ground.
