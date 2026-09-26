# Phase 3 — Cart, Quote, Checkout, Order Creation, Confirmation, Tracking

## Completed

- **`lib/orders/state.ts`** — the central `ALLOWED_FULFILLMENT` /
  `ALLOWED_PAYMENT` / `ALLOWED_PREP` maps (§5), plus `assert*Transition()`
  guards that throw before any illegal UPDATE is attempted. Every write in
  this phase goes through one of these — nothing sets a status column
  directly. `lib/orders/copy.ts` is the one place fulfillment-status display
  copy lives, so the frontend never hardcodes a status string.
- **`lib/pricing/quote.ts`** — `computeQuote()` (pure) and `buildQuote()`
  (computes + persists to `quotes`), covering products, per-group
  TEXT/BOOLEAN/SELECT/MULTISELECT customization pricing, and validation
  (required groups, min/max select counts, unknown/inactive options all
  rejected). `lib/pricing/cart-types.ts` holds the `CartItem`/`CartSelection`
  shapes in a zero-dependency file so client components can import them
  without dragging `serviceClient` (service-role key) into the browser
  bundle.
- **`lib/orders/create.ts`** — `POST /api/v1/orders`'s real implementation:
  idempotent on `client_idempotency_key`, re-quotes and compares against
  the stored quote before creating anything (§7's price-drift check),
  re-checks serviceability at order time (not just at quote time), creates
  the order + items + customizations + an optional `order_locations` row,
  persists `promised_eta_min_at`/`max_at` at creation so the displayed
  promise can't drift later, and routes cash orders straight to
  `AWAITING_RUNNER`/`CASH_DUE` — never through `UNPAID` (§4.3).
- **`lib/payments/`** — the `PaymentProvider` interface (§8) plus `mock.ts`
  (hard-disabled outside development) and `cash.ts` (never actually
  captures — collection is a Phase 6 runner action). `verify.ts` implements
  all four of §8's capture checks: binding (providerRef must match what was
  started), amount (captured cents/currency must equal the order total),
  PENDING as its own outcome, and already-captured treated as a refresh via
  the `provider_capture_id` UNIQUE constraint rather than a hard failure.
- **`POST /api/v1/quote`, `/orders`, `/payments/start`,
  `/payments/:provider/capture`, `GET /api/v1/track/:token`,
  `POST /api/v1/track/:token/moved`** — all six remaining §13 routes this
  phase's scope covers, wired end to end.
- **Frontend**: `ProductPicker` (real catalogue, real prices, real
  customization groups — nothing is a literal), `CheckoutFlow` (quote →
  contact/landmark/description → mock-card-or-cash → order → confirm
  redirect), `TrackView` (polls `/api/v1/track/:token` every 5s, never
  Realtime, per §10) shared between `/confirm/[token]` (adds a one-time
  "confirmed" banner) and `/track/[token]`. `/order`'s serviceable branch
  now leads into this instead of the Phase 2 placeholder message.
- `lib/notifications/transport.ts` — console-sink + `notifications` row per
  send, never throws (a notification failure must never fail the order).
- `lib/security/rate-limit.ts` — in-memory sliding window for `/track`
  (§16); documented as wrong the moment this runs multi-instance.

## Tested

All of the following was run against the real local database (not
mocked), end to end, through the actual Next.js routes:

- **Full paid flow**: quote → order → payment start → mock capture → track,
  driven in a **real browser (Playwright, 390×844)** with the zone
  temporarily opened locally (seed stays `CLOSED` — see below). Screenshots
  taken at the picker, quote, checkout form, and confirmation steps.
  Console clean except expected analytics no-op debug lines and one
  pre-existing (Phase 1) `scroll-behavior: smooth` dev advisory, unrelated
  to this phase.
- **Order creation idempotency**: replaying the same
  `clientIdempotencyKey` returned the same order (not a duplicate) and a
  freshly rotated track token, exactly as designed — confirmed only one row
  exists for that key.
- **Capture idempotency**: calling capture twice on the same payment
  returned `ALREADY_CAPTURED` both times without a second fulfillment
  transition or a duplicate `payments` row.
- **Price-drift detection**: quoted a product, changed its
  `base_price_cents` in the database, then attempted to create an order
  from the stale quote — got `409 PRICE_CHANGED` with both the old and new
  totals in the error, and no order was created. This is the exact §7
  behavior the architecture calls for ("the price changed" rather than
  silently charging a different number).
- **Cash flow**: a cash order lands as `payment_status = CASH_DUE`,
  `fulfillment_status = AWAITING_RUNNER` immediately — confirmed it never
  passes through `UNPAID` (§4.3).
- **Tracking**: confirmed the payload never includes coordinates (only
  `landmark_text`/`customer_description`, both customer-submitted), that an
  unknown token gets an identical 404 shape, and that `POST
  .../track/:token/moved` appends a new `order_locations` row
  (`source = CUSTOMER_MOVED`) alongside the original `CHECKOUT` one rather
  than replacing it.
- `npm run build` green (17 routes now; `/order` is explicitly
  `force-dynamic` so the catalogue can't get baked in at build time).
  `tsc --noEmit` clean. `eslint` clean — caught and fixed a real
  `react-hooks/immutability` violation in `TrackView`'s self-scheduling poll
  (a `useCallback` referencing itself before its own declaration).

### Local-only test state (not committed)

To exercise the serviceable path, the zone's `service_status` was
temporarily set `OPEN`, its `operating_hours` widened, a test runner set
`AVAILABLE`, and `inventory.qty_available` raised above 0 — directly in the
local Postgres instance, never in `supabase/seed/jamaica.sql`. All of it was
reverted after testing (confirmed `zones/resolve` again reports
`ZONE_CLOSED` for the real seeded location), and the test orders/customers
created along the way were deleted. The committed seed still ships closed,
as Phase 2 left it — there is still no confirmed vending permission (§27.1).

## Known gaps

- **No formal automated test suite still** (same call as Phase 2 — deferred
  against the size of the remaining roadmap, not forgotten). Everything
  above was exercised by hand/script this phase.
- **Real payments are Phase 5.** The mock provider proves the full
  order/payment state machine and the four capture checks, but PayPal
  itself, its webhook, and refunds don't exist yet.
- **No admin surface (Phase 4)** — an order placed right now can only be
  inspected via `psql`/Supabase Studio, not a staff UI. `order_events` has
  the full audit trail already (confirmed populated for `created`, the
  `payment` transition, and the `fulfillment` transition on every test
  order), ready for Phase 4 to read.
- **One product per order.** The cart is a single `CartItem`; a real
  multi-line cart (add Classic AND Coco for Two to one order) is server-side
  supported (`buildQuote` already takes `CartItem[]`) but the
  `ProductPicker` UI only builds one. Small gap, deferred rather than
  gold-plating the picker before Phase 4/5 show what checkout actually
  needs.
- **Rate limiting is in-memory, single-process** (`lib/security/rate-limit.ts`)
  — correct for this MVP, wrong the moment this runs on more than one
  server instance. Flagged in the module itself.
- **Order batching and group orders remain explicitly out of scope**
  (§25's own note, Phase 9) — one runner per delivery, one order per
  checkout.
- **ETA on order creation without a location fix** falls back to the
  zone's configured bounds with no travel term — correct behavior, just
  worth knowing it's less precise than the resolve-time estimate when a
  location wasn't captured (shouldn't happen through the built UI, which
  always has coordinates before checkout starts).

## Next: Phase 4

Admin: auth, order board + `at_risk`, zone pause, products, zones, runners.
The schema, RLS staff policies, and `order_events` audit trail are already
in place from Phases 0–3; Phase 4 is mostly a staff-facing UI over verified
ground, plus Supabase Auth wiring for the `ADMIN`/`OPS` roles.
