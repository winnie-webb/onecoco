# One Coco — Phase 0: Product & Technical Architecture

## Context

One Coco is a new, standalone business: on-demand fresh coconut delivery to tourists sitting on beaches, launching in Montego Bay, Jamaica. It is not connected to any other project in this workspace and shares no code with them.

The product exists to answer one question: **can a tourist on a Montego Bay beach order a coconut from their phone and receive it within minutes?** Everything here is subordinate to making that loop work and measurable. The coconut is the first SKU; the long-term thesis is an on-demand commerce layer for beaches.

This document is the Phase 0 deliverable — architecture, schema, flows, roadmap, risks. **No production code is written in Phase 0.** Phase 1 (brand + landing page) begins only on approval.

The order/dispatch/payment model below was adversarially reviewed before being written down; §5–§11 reflect fixes to real holes found in the first draft, noted inline where the reasoning matters.

---

## 1. Decisions locked before design

| # | Decision | Chosen | Consequence |
|---|---|---|---|
| 1 | Who fulfils the order | **One Coco operates it.** Runners are staff; One Coco sources the coconuts. | No vendor entity, no payouts engine, no money splitting. |
| 2 | Payment rail | **PayPal Orders v2 (server-side capture) first**, behind a `PaymentService` interface, **Stripe planned second**. Cash on delivery supported throughout. | Launch isn't blocked on forming a foreign entity. |
| 3 | Data + realtime platform | **Supabase** — Postgres + PostGIS + Realtime + Auth + RLS. | Delivery zones are a real geospatial query. Real FKs and transactions on money. |
| 4 | MVP scope | **Status + honest ETA range. No live runner map.** | See §1.1 — the most valuable decision in the document. |
| 5 | Brand name | **Not locked. Phase 1 is built name-agnostic.** | Wordmark and name isolated to one component + one config file (§28). A rename stays cheap. |

### 1.1 What "no live map" buys

- **A web page stops receiving GPS when the screen locks or the app backgrounds.** There is no reliable background geolocation on mobile web. A live pin in a PWA would freeze the moment a runner pockets their phone — showing the customer a stale pin that is, functionally, a lie. §34 of the brief forbids exactly that.
- Dropping it means the MVP collects **no runner GPS at all**: no `watchPosition`, no wake lock, no write throttling, no battery tuning, no staff-location retention policy.
- With a handful of runners on one beach, proximity dispatch is over-engineering. MVP dispatch needs zero runner location.
- The customer bundle ships **no map SDK**. Location confirmation uses one static satellite image (~30 KB) instead of a ~200 KB interactive library — the right call for a weak beach signal regardless.

Runner position becomes a Phase 7 concern, introduced with the map, with the staleness problem designed for rather than ignored.

---

## 2. Product architecture

1. **Direct-to-consumer** (Phases 1–6) — the tourist orders. This is the business; everything else is distribution for it.
2. **Partner/QR attribution** (Phase 9) — hotels, beach chairs, concierge. Technically *one table and one URL parameter* landing on the same D2C flow. Deliberately cheap.
3. **B2B group orders** (Phase 9) — a tour operator pre-ordering 30 for 11:30. Scheduled + quantity + invoice, sharing the same order spine.

### The one flow that matters

```
Landing  →  Locate  →  Choose  →  Pay  →  Track  →  Delivered
  ~2s        1 tap     1–2 taps   1 form   passive    rate/share
```

Target: **under 60 seconds, under 6 taps** from landing to paid.

---

## 3. Technical architecture

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server Components keep the bundle small on weak cell; Route Handlers give the Runner PWA and PayPal webhooks a real HTTP API. Types protect money, geo and a state machine. |
| Styling | **Tailwind** + hand-rolled components | No component library — the brand is the product; a generic kit fights it. A small set of owned primitives is cheaper than overriding someone else's. |
| Database | **Supabase Postgres + PostGIS** | `ST_Covers(zone.polygon, point)` *is* the delivery-zone requirement. Document stores force app-side point-in-polygon. Plus real FKs and transactions on order/payment consistency. |
| Realtime | **Supabase Realtime for authenticated staff only** | Admin board and runner offers are "watch these rows" with a real JWT. Guests **poll** — see §10. |
| Auth | **Supabase Auth** for staff. **No customer account** — guest checkout. | Registering before a $7 coconut kills the funnel. Identity is the order token. |
| Payments | **PayPal Orders v2**, server-side capture, behind `PaymentService` | §8. |
| Maps | **Static satellite image** (customer) + **Mapbox GL JS** (admin zone editor only) | Customer path carries no map SDK. Admin is desktop and can afford one. |
| Hosting | **Vercel** | Matches Next.js; preview deploys per branch. |
| Analytics | **PostHog** (funnels) + `order_events` in Postgres as source of truth | Funnels are a solved product; operational truth stays in our own DB. |

---

## 4. Data model

Integer cents everywhere. `currency` per order. `timestamptz`. UUIDs except human-facing `order_number`.

### 4.1 Geography

```
countries(id, iso2, name, default_currency, active)
regions(id, country_id, name, slug)
cities(id, region_id, name, slug, timezone, active, seo_*)
beaches(id, city_id, name, slug, blurb, hero_image,
        center geography(Point,4326), active, seo_*)
delivery_zones(id, beach_id, name,
        polygon geography(Polygon,4326),
        delivery_fee_cents, eta_min_minutes, eta_max_minutes,
        route_factor numeric,           -- calibrated detour multiplier
        operating_hours jsonb,
        service_status,                 -- OPEN | PAUSED | CLOSED
        pause_reason, pause_until,
        access_notes, requires_property_permission bool,
        priority smallint, active)
prep_points(id, beach_id, name, location geography(Point,4326), active)
```

`service_status = PAUSED` is the single most-used control in a real delivery ops console — rain, rough sea, a runner walking off. `operating_hours` alone cannot express it, and bolting it on later means every serviceability check needs revisiting.

`priority` resolves zone overlap deterministically. Overlapping polygons are legitimate (a small high-priority zone inside a large one), so this is a resolution rule, not a constraint violation.

### 4.2 Catalogue & pricing

```
products(id, sku, name, slug, description, image,
         base_price_cents, currency, active, sort_order)
product_availability(id, product_id, beach_id NULL, zone_id NULL,
         active, price_override_cents)
customization_groups(id, key, label, input_type, required,
         max_length, min_select, max_select, sort_order)
customization_options(id, group_id, value, label,
         price_delta_cents, active, sort_order)
product_customization_groups(product_id, group_id, required, sort_order)
quotes(id, payload jsonb, total_cents, currency, zone_id,
       created_at, expires_at)
inventory(id, prep_point_id, sku, qty_available, qty_reserved, updated_at)
```

No price is ever a literal in code. `product_availability` lets a beach carry a different price or lineup without a code change.

**`quotes` is persisted** so the checkout re-quote can *compare* against what the customer was shown and say "the price changed" — rather than silently charging a different number.

### 4.3 Orders — the spine

The first draft used a single `status` enum. That was the load-bearing flaw: it conflated money with fulfilment, so *delivered-then-refunded* erased the delivery, partial refunds were unrepresentable, and **cash-on-delivery had no valid entry state at all** — it never passes through `PAID`, but `PENDING_PAYMENT` is wrong because the order is confirmed and dispatchable. Three orthogonal tracks fix it:

```
customers(id, email, phone, name, marketing_opt_in, created_at)

orders(id, order_number, customer_id,
       beach_id, zone_id, prep_point_id, quote_id,
       client_idempotency_key uuid UNIQUE,

       fulfillment_status,   -- PLACED, AWAITING_RUNNER, ASSIGNED,
                             -- OUT_FOR_DELIVERY, DELIVERED,
                             -- UNDELIVERABLE, CANCELLED, EXPIRED
       payment_status,       -- UNPAID, AUTHORIZED, CAPTURED,
                             -- PARTIALLY_REFUNDED, REFUNDED, FAILED,
                             -- VOIDED, CASH_DUE, CASH_COLLECTED
       prep_status,          -- NOT_STARTED, IN_PROGRESS, READY, FAILED

       subtotal_cents, customization_cents, delivery_fee_cents,
       tax_cents, tip_cents, total_cents, currency,
       amount_captured_cents, amount_refunded_cents,

       contact_name, contact_phone, contact_email,
       delivery_note, landmark_text, customer_description,
       delivery_photo_url,
       delivery_code,              -- 4 digits, customer shows the runner

       track_token_hash, track_expires_at,
       promised_eta_min_at, promised_eta_max_at,
       accept_deadline_at,
       arriving_announced_at,
       prep_started_at, prep_ready_at, delivered_at,
       cancelled_at, cancelled_by, cancellation_reason,
       undeliverable_resolution, contact_attempts,

       partner_id, qr_code_id, campaign_id,
       scheduled_for, placed_at, created_at, updated_at)

order_items(id, order_id, product_id, qty,
       unit_price_cents, line_total_cents, name_snapshot)
order_item_customizations(id, order_item_id, group_id, option_id,
       text_value, price_delta_cents, label_snapshot)
order_locations(id, order_id, point geography(Point,4326),
       accuracy_m, source, captured_at)
order_events(id, order_id, track, from_value, to_value,
       actor_type, actor_id, reason, occurred_at, meta jsonb)
```

Notes on the non-obvious columns:

- **`amount_refunded_cents`** derived from `refunds` makes a partial refund *arithmetic*, not a state. Delivered-then-refunded is `DELIVERED` + `REFUNDED`, both true simultaneously.
- **`prep_status` is its own track** because prep happens at a cart, by someone who isn't the runner, and can start on payment regardless of assignment. A linear chain cannot express "prepared, waiting for a runner" or "runner assigned, prep not started" — both perfectly ordinary. `OUT_FOR_DELIVERY` becomes a *precondition check* (`prep_status = READY` AND an active assignment), not a position in a line.
- **`arriving_announced_at` replaces a `NEAR_CUSTOMER` state.** It's an event, not a state — it gates no permission and changes no legal transition. As a state, every runner who forgot to tap it would strand an order.
- **`accept_deadline_at`** computed at creation from the zone's closing time. Without it, a paid order nobody accepts before the beach closes has no path at all. That happens in week one.
- **`delivery_code`** — four digits the customer shows the runner. Cheap, and it does double duty: proof of delivery, and a findability signal on a crowded beach.
- **`track_token_hash`** — we store `sha256(token)`, never the token. A leaked log or read-replica otherwise hands out live tracking links.
- **`*_snapshot`** columns keep a six-month-old order rendering correctly after a product is renamed or repriced.

**`order_events` is written by a database trigger, not by application code.** An admin doing a manual SQL fix would otherwise bypass the audit spine entirely.

### 4.4 Payments

```
payments(id, order_id, provider, provider_capture_id UNIQUE,
         provider_ref, status, amount_cents, currency,
         environment, raw jsonb, created_at, settled_at)
refunds(id, payment_id, provider_refund_id UNIQUE, amount_cents,
        reason, actor_user_id, status, created_at)
webhook_events(id, provider, provider_event_id UNIQUE, type,
        payload jsonb, received_at, processed_at, error)
```

**Idempotency is enforced on the business effect, not the event.** `webhook_events.provider_event_id` de-dupes *retries of the same event*; it does not de-dupe two different events describing the same money, nor handle out-of-order arrival (a refund event can land before the capture event is processed). The real guards are `payments.provider_capture_id UNIQUE` and `refunds.provider_refund_id UNIQUE`. `webhook_events` is a receipt log.

### 4.5 Fulfilment

```
app_users(id→auth.users, email, display_name, role, active)
runners(id, user_id, name, phone,
        shift_status,              -- OFF_SHIFT | AVAILABLE | BUSY | ON_BREAK
        max_concurrent_orders,
        device_last_seen_at,       -- heartbeat
        home_beach_id, active)
shifts(id, runner_id, beach_id, zone_id,
       started_at, ended_at, end_requested_at)
shift_cash(shift_id, float_start_cents, collected_cents, dropped_cents)
order_offers(id, order_id, runner_id,
        offered_at, expires_at, responded_at, response)
order_assignments(id, order_id, runner_id,
        assigned_at, released_at, release_reason)
        -- UNIQUE (order_id) WHERE released_at IS NULL
```

**`order_assignments`, not a nullable `runner_id`.** One column can't express reassignment, handoff, or "was assigned then dropped" — and nulling it out to reassign both destroys the record of who abandoned the order and lets a stale client re-grab it. The partial unique index makes double-assignment impossible at the database level while keeping full history.

`device_last_seen_at` exists because *status is a claim made at a past instant; liveness is a separate signal*. An order sitting in `OUT_FOR_DELIVERY` with a runner whose phone died 20 minutes ago looks identical to a healthy one without it. The ops board derives an `at_risk` view from it — a view, not a status.

### 4.6 Growth & ops

```
partners(id, name, type, contact_email, contact_phone, beach_id,
         commission_rate_bps, status, created_at)
partner_users(partner_id, user_id, role)
campaigns(id, name, slug, partner_id, starts_at, ends_at)
qr_codes(id, code UNIQUE, partner_id, campaign_id, beach_id,
         placement_label, active, created_at)
zone_demand_requests(id, point geography(Point,4326), email,
         guessed_location_label, created_at)
reviews(id, order_id UNIQUE, rating, comment, photo_url, published, created_at)
notifications(id, order_id, channel, template, recipient,
         status, provider_ref, sent_at, error)
audit_log(id, actor_user_id, action, entity, entity_id,
         before jsonb, after jsonb, occurred_at)
settings(key PRIMARY KEY, value jsonb, updated_by, updated_at)
```

`zone_demand_requests` is the out-of-zone "notify me" capture — the only evidence for where to expand next, so it ships in the MVP despite earning nothing on day one.

`settings` holds tax rate, service fee, walking-speed constant, prep time and capacity caps — every number that would otherwise become a literal.

---

## 5. Order lifecycle

Three independent tracks. Each transitions through one guarded server-side function; nothing writes these columns directly.

**Fulfilment**
```
PLACED ──► AWAITING_RUNNER ──► ASSIGNED ──► OUT_FOR_DELIVERY ──► DELIVERED
   │              │                │               │
   │              └──► EXPIRED     │               └──► UNDELIVERABLE
   └──────────────────────────────►└──► CANCELLED
```

**Payment** — `UNPAID → AUTHORIZED → CAPTURED → PARTIALLY_REFUNDED → REFUNDED`, plus `FAILED`, `VOIDED`, and the cash path `CASH_DUE → CASH_COLLECTED`.

**Prep** — `NOT_STARTED → IN_PROGRESS → READY`, plus `FAILED`.

### Transition safety

```sql
UPDATE orders SET fulfillment_status = $new, updated_at = now()
WHERE id = $id
  AND fulfillment_status = $expected
  AND cancelled_at IS NULL
RETURNING *;
-- zero rows → someone else moved it; reject, do not blindly retry
```

A central `ALLOWED` map per track is the only definition of legal moves; the frontend imports the *type* and never hardcodes a string. The `order_events` row is appended by trigger.

### Terminal states carry causes

- **`CANCELLED`** has one shape but six causes with different money outcomes — pre-prep customer cancel, post-prep cancel, ops cancel, weather closure, no-show, stock-out. Hence `cancelled_by` (`CUSTOMER | OPS | RUNNER | SYSTEM`) + `cancellation_reason`, which drive the refund decision.
- **`UNDELIVERABLE`** needs a resolution, not a dead end: the coconut exists and somebody paid. `undeliverable_resolution` (`RETRIED | REFUNDED | FORFEITED | DISPOSED`) plus `contact_attempts`.
- **`EXPIRED`** is swept by cron against `accept_deadline_at`, auto-refunding and notifying.

---

## 6. Dispatch

1. Order becomes dispatchable → an `order_offers` row per available runner on that beach, with `expires_at`.
2. Runners see offers in a Realtime-subscribed list (they have real JWTs; RLS works here).
3. The race is resolved by the database:
   ```sql
   INSERT INTO order_assignments (order_id, runner_id, assigned_at)
   VALUES ($o, $r, now())
   ON CONFLICT (order_id) WHERE released_at IS NULL DO NOTHING
   RETURNING *;
   ```
   Zero rows → "Someone got that one first." No lock, no queue.
4. The accept path additionally checks `fulfillment_status = 'AWAITING_RUNNER' AND cancelled_at IS NULL` — otherwise a stale client can claim a cancelled or refunded order.
5. Concurrency cap can't be done in a single-row UPDATE; it needs a function counting active assignments under `SELECT … FOR UPDATE` on the runner row.
6. No acceptance before `expires_at` → `AWAITING_RUNNER` + ops alert.

**Product note:** first-to-tap-wins gives *staff* runners an incentive to cherry-pick near orders and let far ones rot. Worth watching in the pilot; push-assignment is the fallback, and the `order_offers` table supports either without schema change.

---

## 7. Pricing & serviceability

```ts
quote(cart, zone, context) → { lines[], subtotal_cents, customization_cents,
  delivery_fee_cents, tax_cents, total_cents, currency, eta_min, eta_max }
```

- The client **never sends a price** — only product ids, quantities, option ids.
- Checkout **re-quotes** before creating the payment and compares against the stored `quotes` row.
- Captured amount is compared to the stored total in integer cents before anything is marked paid (§8).
- Tax rate, fees and constants come from `settings` and `delivery_zones`.

### The serviceability gate

Zone containment alone is not enough to accept an order. All of these must hold:

```
zone is within operating_hours
AND zone.service_status = 'OPEN'
AND ≥1 runner on shift in that zone
AND inventory.qty_available > 0
```

Without this, at 2pm on a cruise-ship day with one runner and six open orders, the app confidently quotes 8–12 minutes to customer seven. **When no runner is on shift, the honest answer is "not right now" — not a range.**

ETA is therefore `prep_time + queue_wait(open_orders ÷ available_runners) + travel × zone.route_factor`, clamped to the zone bounds, and `promised_eta_min_at`/`promised_eta_max_at` are persisted at order time so on-time rate is measurable and the displayed promise can't silently drift.

---

## 8. Payment architecture

```ts
interface PaymentProvider {
  name: string
  isConfigured(): boolean
  environment(): 'sandbox' | 'live'
  start(args): Promise<StartResult>
  capture(args: { providerRef, expectedOrderId, expectedCents, currency }): Promise<CaptureResult>
  refund(args: { paymentId, amountCents, reason }): Promise<RefundResult>
}
```

Providers: `paypal` (first), `cash` (runner-settled), `mock` (dev only, hard-disabled in production), `stripe` (Phase 5+). Order code never names a provider.

### Why PayPal's shape helps on a beach

With `intent: CAPTURE`, approving only **authorises** — our server's capture call is what charges. A customer whose signal drops mid-redirect has therefore genuinely *not paid*, and our records are honest by construction. Given the connectivity, a lost redirect is a likely event, not an edge case.

### Four checks before any order is marked paid

1. **Binding** — the capture's `custom_id` equals the order id we issued. `invoice_id` is also set to the order id, which makes PayPal itself refuse a second capture against it.
2. **Amount** — captured amount and currency equal what we asked, in integer cents. *This is the check implementations skip.* No forgery is needed — a provider will happily report a genuine capture for **less**.
3. **`PENDING` is its own outcome** — never folded into paid or failed.
4. **Already-captured** is the refresh path, treated as paid, not an error.

### Consistency rules

- **Create the order row before calling PayPal.** Otherwise capture succeeds, the DB write fails, and you hold a tourist's money with no order.
- `PayPal-Request-Id: <order_id>` on the capture for provider-side idempotency.
- `orders.client_idempotency_key UNIQUE`, generated on the cart page — a double-tapped Pay button on a laggy connection is the expected case.
- A capture that throws writes nothing and leaves the payment `initiated`; a timeout can mean the charge went through and we lost the answer. A reconciliation sweep lists recent provider captures and flags any with no matching `payments` row.
- The webhook is **source of truth**; the browser redirect is UX convenience.
- Webhook handler must read the **raw body** (`await req.text()`) before any JSON parse, or signature verification breaks. Verify, log the receipt, apply the effect in a second pass so a slow handler doesn't hit the Vercel timeout and trigger a retry storm.
- **The webhook endpoint must be registered in the provider dashboard and verified with a real test event before launch.** A perfectly correct handler that is never invoked looks exactly like a broken payment system from the outside: customers pay repeatedly and nothing activates. Blocking item on the go-live checklist.

### Stripe later

Stripe does not support Jamaica-based businesses — no Caribbean country is on their list — so it needs a foreign entity and bank account. It's in the architecture because it unlocks **Apple Pay / Google Pay one-tap with no redirect**, materially the best checkout for a one-handed beach order. The interface is what makes that a swap rather than a rewrite.

Separately: PayPal in Jamaica can receive but cannot withdraw to a local bank; settlement routes via Payoneer/Wise or a US account. Ops task, not engineering, but it's on the launch checklist.

---

## 9. Location & zones

### Capture

One-shot `getCurrentPosition` with `enableHighAccuracy`. We store the point, `accuracy_m` and timestamp in `order_locations`. **No continuous customer tracking.**

### Getting the PostGIS right

Use **`ST_Covers(zone.polygon, point)`**, not `ST_Contains`. `ST_Contains` has **no geography signature** — it forces a cast to `geometry`, at which point every distance is in *degrees*, and a later `ST_DWithin(…, 75)` silently means 75 degrees. `ST_Covers` has a geography signature and returns true on the boundary. GiST index on `polygon`.

### Handling noisy fixes honestly

- Browser geolocation is ±10–50 m on a good GPS fix and can be hundreds of metres on a wifi/IP-derived one. A binary containment test on a noisy point is a coin flip at the boundary.
- `accuracy_m` above ~100 m is treated as **unconfirmed** — we show the static map and ask the customer to confirm or drag the pin.
- A point just outside a polygon but within `ST_DWithin(polygon, pt, 75)` is a **borderline band**: "you look like you're just outside our zone — confirm?" rather than a flat rejection. A 20 m GPS error should not lose a sale.
- Overlapping zones resolve by `priority`, then smallest area.
- Manual fallback for denied permission: pick your beach from a list, then a landmark.

### Why straight-line distance is structurally wrong here

Much of the Montego Bay coastline is gated resort property. A runner cannot walk through a hotel's beach. The error isn't just large, it's *uneven*: two points 200 m apart may be a 90-second walk or an 800 m detour around a property line. Hence `zones.route_factor`, calibrated from observed travel times, and `zones.requires_property_permission` — which is a legal constraint as much as a routing one.

### Re-capture

People swim, move to the bar, change chairs. `order_locations` is append-only; the tracking page offers **"I moved"**, which appends a fix and notifies the assigned runner. The first draft's only answer to a customer who moved was `UNDELIVERABLE`.

### ETA presentation

A **range** — "6–9 minutes" — never a countdown. Routing engines don't model sand, crowds, or a runner carrying a tray, so a precise minute would be false precision. We show a range and update the *status*, which is true.

---

## 10. The tracking page — polling, not Realtime

The first draft had the guest page subscribe to its own order row via Supabase Realtime. **That doesn't compose.** A guest has no JWT, so there is no RLS policy expressing "this anonymous client holds the token"; the workarounds are `USING (true)` for `anon` or an exposed view, both bad. Worse, `postgres_changes` ships the **whole row** — customer coordinates, runner id, payment refs — to every subscriber that passes RLS.

**The guest tracking page polls `GET /api/v1/track/:token` every ~5 seconds.** For a ten-minute order this is genuinely fine, it returns only the fields we choose, it degrades far better on bad connectivity than a dropped socket, and it removes the whole RLS problem. Supabase Realtime stays where it works naturally: authenticated staff (admin board, runner offers).

### Token hygiene

- ≥128 bits from a CSPRNG; never sequential, never derived from the order id.
- Stored as `track_token_hash`.
- `Referrer-Policy: no-referrer` on `/track` — otherwise the token leaks in the `Referer` header to PayPal, analytics, fonts, map tiles.
- `track_expires_at` (delivered + ~24 h), after which the page degrades to a receipt with no location. **Tourists screenshot and share tracking pages; a live link revealing a specific person's exact position on a beach is a physical-safety issue, not just a data one.**
- The payload never includes precise coordinates or full personal data. Cancel requires a second factor (the `delivery_code`).
- Rate-limited by IP; identical response shape for invalid tokens.

Backup channels: email confirmation and receipt, plus tap-to-call/WhatsApp the runner. International SMS to tourist numbers is expensive and unreliable — not the default.

---

## 11. The hardest real problem: the last 20 metres

GPS puts a runner within ~10 m of a customer on a beach holding several hundred people. That is not enough to identify one person. This decides whether the product works, and deserves more attention than the map would have.

In the MVP:

1. **`landmark_text`**, prompted with concrete examples ("blue umbrella near the jerk stand").
2. **`customer_description`** ("red hat, two kids"). In practice this finds people more reliably than coordinates do.
3. **Optional photo of the spot.** The brief defers this; I'd argue it into the MVP — highest-value field on the form, costs one upload.
4. **Runner taps "arriving"** → the customer's page switches to a stand-up-and-wave prompt with the runner's name.
5. **`delivery_code`** — the customer shows four digits. Confirms the right person and doubles as proof of delivery.
6. **Tap-to-call / WhatsApp** from the tracking page.
7. **`UNDELIVERABLE` with a resolution**, so a runner never quietly marks a failure as delivered.

---

## 12. Proof of delivery & cash handling

Cash-on-delivery plus staff runners handling tourist money on a beach means "I never got my coconut" must be answerable and shrinkage must be detectable:

- `delivery_code` confirmed at handover; optional `delivery_photo_url`.
- `cash_collected_cents` per order; `shift_cash` float/collected/dropped per shift.
- `refunds.actor_user_id` — every refund has a named human.
- **`occurred_at` (device clock) recorded alongside `recorded_at` (server).** The runner app *will* be used with no signal; offline actions need client-generated action ids and server-side idempotency, or delivery-time metrics end up measuring cell coverage.

---

## 13. API architecture

Route Handlers under `/api/v1/*` for everything stateful. Server Components for reads.

| Route | Purpose |
|---|---|
| `POST /api/v1/zones/resolve` | lat/lng + accuracy → zone, serviceability, fee, ETA range |
| `POST /api/v1/quote` | cart → persisted quote |
| `POST /api/v1/orders` | create order (idempotency key required) |
| `GET  /api/v1/track/:token` | guest tracking payload (polled) |
| `POST /api/v1/track/:token/moved` | append a new location fix |
| `POST /api/v1/payments/start` | create provider payment from stored total |
| `POST /api/v1/payments/:provider/capture` | server-side capture + the four checks |
| `POST /api/v1/webhooks/:provider` | raw-body signature verify, receipt, deferred effect |
| `POST /api/v1/demand` | out-of-zone capture |
| `GET  /api/v1/runner/offers` | offers for this runner's beach |
| `POST /api/v1/runner/offers/:id/accept` | race-safe accept |
| `POST /api/v1/runner/orders/:id/transition` | guarded transition |
| `POST /api/v1/runner/heartbeat` | liveness |
| `/api/v1/admin/*` | orders, products, zones, runners, partners, settings |

---

## 14. Folder structure

```
app/
  (marketing)/   page.tsx, how-it-works, build-your-coco, partners,
                 [city]/page.tsx, [city]/[beach]/page.tsx
  (order)/       order/, checkout/, confirm/[token]/, track/[token]/
  (runner)/runner/   login, today, offers, order/[id]
  (admin)/admin/     orders, products, zones, runners, partners, settings
  (partner)/partner/ dashboard, qr-codes
  api/v1/...
  opengraph-image.tsx, robots.ts, sitemap.ts
lib/
  brand.ts       name, tagline, copy — the ONLY place the brand name appears
  db/            client, generated types, queries/
  orders/        state.ts (ALLOWED maps), numbering.ts, create.ts
  pricing/       quote.ts, serviceability.ts, eta.ts, tax.ts
  geo/           zones.ts, distance.ts
  dispatch/      offers.ts, assign.ts
  payments/      index.ts, paypal.ts, cash.ts, mock.ts, verify.ts
  notifications/ transport.ts, templates/
  analytics/     events.ts
  auth/          roles.ts, guards.ts
components/
  ui/            Button, Sheet, Field, Money, StatusSteps
  order/         LocationGate, ZoneResult, ProductCard, CocoBuilder, Cart
  runner/        OfferCard, ActiveDelivery, StatusButtons
supabase/
  migrations/    0001_geography.sql, 0002_catalogue.sql,
                 0003_orders_and_state.sql, 0004_payments.sql,
                 0005_fulfilment.sql, 0006_rls.sql
  seed/          jamaica.sql
tests/
```

---

## 15. Journeys

**Customer** — Land → "Get a Coco" → permission (reason shown *before* the browser prompt) → zone + serviceability result → pick/customise → quote → details → pay → confirm → track (poll) → delivered → rate/share.

**Runner** — Log in → start shift → offers for their beach → Accept (race-safe) → Picked up → Arriving → Delivered (code + optional photo) → next. Can't find them: → `UNDELIVERABLE` with a reason.

**Admin** — Live order board (Realtime) with an `at_risk` view → intervene on stuck orders → **pause a zone** → manage products/prices/zones/runners → refunds → funnel.

**Partner** (Phase 9) — Orders attributed to their QR codes → commission → print QR codes.

---

## 16. Security

- **RLS on every table.** The Supabase anon key is public by design; RLS *is* the access control. Classic footgun — it gets explicit tests.
- Runners read only offers for their beach and orders assigned to them; partners only their `partner_id`; admin by role claim; public reads only active catalogue and geography.
- Guest access is by hashed unguessable token only (§10), never by `order_number`.
- Webhooks: raw-body signature verification, then idempotent inserts on the business-effect keys.
- Rate limits on `/orders`, `/quote`, `/demand`, `/track`.
- Public-form anti-abuse: honeypot + submit dwell-time floor + origin check, all failing with the same vague error so a bot learns nothing. **No CAPTCHA** — it costs real conversions and adds a third-party script to the critical path.
- `audit_log` on price changes, zone changes, refunds, manual overrides.
- Service-role key server-only; no secrets in client bundles.

---

## 17. Privacy

- Customers: one-shot capture, plus explicit re-capture when they tap "I moved". Never background tracking. Purpose explained before the browser prompt.
- Retention: exact points kept until delivered + 30 days, then **truncated to zone level** by a scheduled job. Analytics keeps the zone, not the person's spot on the sand. Delivery photos deleted on the same schedule.
- Tracking links expire (§10).
- **No runner location collected at all in the MVP.** When it arrives in Phase 7 it's collected only during an active delivery, with its own short retention.

---

## 18. Analytics

Instrumented from Phase 2 — a funnel added later has no history.

```
visit → get_coco_click → location_granted → in_zone → serviceable
      → product_selected → checkout_started → payment_succeeded → delivered
```

Two drop-offs to watch specifically: **location denied** (a UX failure we can fix) and **out of zone / not serviceable** (a market signal we should act on — and note these are now *different* events, since a zone can be in-area but paused or runner-less).

PostHog for funnels; `order_events` for every operational metric. Attribution columns ship on `orders` from day one even though partners are Phase 9 — backfilling attribution is impossible.

---

## 19. SEO

```
/                                /how-it-works
/montego-bay                     /build-your-coco
/montego-bay/doctors-cave-beach  /partners
```

City and beach pages only — **no zone pages**, no programmatic sprawl. Genuinely useful tourist content plus the order CTA. `robots.ts`, `sitemap.ts`, `LocalBusiness` + `Product` JSON-LD, OG images.

---

## 20. Performance budget

| Metric | Budget |
|---|---|
| Landing HTML + critical CSS | < 30 KB |
| Landing JS (gzipped) | < 120 KB |
| LCP on simulated 3G | < 2.5 s |
| Map SDK on customer path | **0 bytes** |
| Hero image (390 px) | < 80 KB AVIF/WebP |

Server Components by default (`use client` only on interactive leaves), `next/image` with AVIF/WebP and `deviceSizes` starting at **390**, `priority` only above the fold, static satellite thumbnail instead of an interactive map, PayPal SDK loaded only at the checkout step.

---

## 21. Mobile & accessibility

Designed at **390 px first**, desktop second. Thumb-reachable primary actions, 16 px minimum input font (prevents iOS zoom-on-focus), `env(safe-area-inset-bottom)` on fixed bars, large tap targets.

Semantic HTML, labelled fields, visible focus, contrast checked against green/lime/sand (lime-on-white is the likely failure — it gets a darker token for text), alt text, `prefers-reduced-motion`, status changes announced via a live region.

---

## 22. Third-party services

| Service | Purpose | Phase | Mockable? |
|---|---|---|---|
| Supabase | DB, auth, realtime, storage | 2 | Local Supabase |
| PayPal | Payments | 5 | Yes — `mock` provider |
| Mapbox | Static images + admin editor | 2 / 4 | Yes — placeholder |
| Resend (or similar) | Transactional email | 5 | Yes — console sink |
| PostHog | Funnels | 2 | Yes — no-op sink |
| Vercel | Hosting | 1 | — |

Phases 1–4 need **no external accounts** beyond Supabase and Vercel.

---

## 23. Environments

`development` (local Supabase) → `preview` (per-branch Vercel + staging Supabase, PayPal sandbox) → `production`. Env vars only, nothing committed; `.env.example` documents *why* each exists.

Two settings that fail **silently** if wrong, and so are verified explicitly at go-live: the **site URL** used to build payment return URLs, and the **payment environment flag** (sandbox vs live).

---

## 24. Testing

| Level | Covers |
|---|---|
| Unit (Vitest) | `quote()`, serviceability gate, ETA, all three transition maps, order numbering |
| Integration | order creation + idempotency, capture verification (all four checks), webhook idempotency on business-effect keys, concurrent accepts, RLS policies |
| E2E (Playwright, 390 px) | landing → locate → choose → checkout → pay (mock) → confirm → track; runner: login → shift → accept → deliver |

The three I'd write first, because they're where correctness and money live: **an underpaid capture is rejected**, **two simultaneous accepts produce exactly one assignment**, and **a zone with no runner on shift refuses to quote an ETA**.

---

## 25. Roadmap

| Phase | Deliverable | External deps |
|---|---|---|
| **0** | This document | — |
| **1** | Brand + landing + marketing pages, responsive, real imagery | none |
| **2** | Schema + migrations + seed; location capture; zone + serviceability resolution; catalogue; analytics instrumented | Supabase |
| **3** | Cart, quote, checkout, order creation, confirmation, guest tracking (mock payment) | none |
| **4** | Admin: auth, order board + `at_risk`, zone pause, products, zones, runners | none |
| **5** | Real payments (PayPal), webhooks, refunds, email | PayPal, Resend |
| **6** | Runner PWA: login, shift, offers, accept, status, delivery code, cash | none |
| **7** | Runner GPS + live map + proximity dispatch (the deferred piece) | Mapbox |
| **8** | Build Your Coco (full personalisation + preview) | none |
| **9** | Partners, QR attribution, commissions, group/scheduled orders | none |
| **10** | Analytics dashboards; Montego Bay pilot hardening | none |
| **11** | Multi-beach expansion (config only, no rewrite) | none |

**MVP = Phases 1–6.** A tourist can order and pay, ops can see and manage it, a runner can deliver it. Enough to learn whether the business works.

Each phase ends with the §33 checklist — run it, test the primary flow at 390 px, check console and server errors, verify DB integrity, review security, document done/remaining. No phase starts while the previous one is fundamentally broken.

---

## 26. Risks

### Business — these dwarf the engineering

1. **Beach access and vending rights.** Which beaches will permit a One Coco runner to operate commercially? No software fixes a runner turned away at the gate. **This gates the pilot and only you can answer it.**
2. **Supply and staffing.** One runner off shift means the beach must go dark gracefully — hence the serviceability gate and zone pause in the MVP rather than bolted on later.
3. **Unit economics at US$7.** Card fees run ~7% on a $7 ticket before the runner's cost per delivery. Margin lives in the delivery fee, the $2 personalisation and Coco for Two. Worth modelling before pricing is fixed.
4. **Payment settlement.** PayPal receives in Jamaica but can't withdraw locally — Payoneer/Wise/US account is on the critical path to actually getting paid.
5. **Seasonality and weather.** Rain empties a beach; expect an order of magnitude of demand variance.

### Technical

6. **The last 20 metres** (§11) — the real product risk, mitigated but not solved by software.
7. **Location permission denial** — a hard funnel wall. Needs the manual fallback, instrumented from day one.
8. **Weak cell / captive-portal hotel WiFi** — drives the performance budget, the no-map-SDK decision, and polling over sockets.
9. **Silent payment misconfiguration** — an unregistered webhook or a wrong sandbox/live flag both fail invisibly. Both are blocking, verified go-live items.
10. **Offline runner actions** — the runner app will lose signal mid-delivery; §12's action ids and device timestamps are the mitigation.

---

## 27. Open questions

Two need answers before the phase that depends on them; none block Phase 1.

1. **Pilot beach + operating permission** — which beach, and is permission secured? *(Blocks Phase 10; shapes Phase 2 seed data.)*
2. **Capture timing** *(decide before Phase 5)* — capture at checkout is simple, but every unaccepted order then becomes a refund, and PayPal keeps its fee on refunds. On a $7–10 coconut that's real margin. The alternative is authorise at checkout, capture at assignment. Recommend deciding once we see how often orders go unaccepted in the pilot; the interface supports both.
3. **Cash currency** — runners will be handed JMD, orders are priced in USD. Is there a posted rate, or is cash USD-only? Needs a `cash_currency` + `fx_rate_used` if both.
4. **Tax treatment** — the rate is a `settings` value either way; I won't hardcode one.
5. **Tips to staff runners** — a payroll/tax question, not just a UI toggle. Nothing in the schema until it's answered.
6. **Brand name — deliberately still open.** "One Coco" is the working name; the final name is not locked, so **Phase 1 is built name-agnostic** (see §28). This is a decision, not a loose end: it costs a small amount of structure now and removes the risk of redoing the brand work later.
7. **Domain.** `onecoco.com` is **taken** — registered 2006, held at NameBright/TurnCommerce (a domain-investor registrar), expiry 2027-01-02; almost certainly for sale at investor pricing. Checked as unregistered right now: `getonecoco.com`, `onecocojamaica.com`. Also checked and **all taken**, three of them parked at investor registrars: `cocodrop.com`, `beachcoco.com`, `jellycoco.com`, `cocorunner.com` — the short coconut `.com` space is picked over generally, so any replacement name will face the same problem. Worth knowing before a naming pass is commissioned.
8. **Is Build Your Coco physically produced at launch**, or a Phase 8 promise?

Explicitly **out of MVP scope**, noted so the capacity maths already assumes it's coming: **order batching** (one runner carrying three coconuts) is not expressible in this model.

---

## 28. What Phase 1 does, on approval

Scaffold Next.js + TypeScript + Tailwind, establish the design system (green / lime / sand tokens, type scale, rounded cards, large buttons), and build the public marketing surface — wordmark treatment, nav, hero, product introduction, how-it-works, Build Your Coco teaser, partner section, CTA, footer — responsive, verified at 390 px first.

### Built name-agnostic

The brand name is not final (§27.6), so Phase 1 is structured so a rename is a config change, not a redesign:

- **`lib/brand.ts` is the single source of the name**, tagline, supporting copy and social handles. Nothing else in the codebase contains the literal brand name — including `metadata`, the OG image, the footer and the legal pages.
- **`<Wordmark/>` is one component.** The logo lockup lives there and nowhere else; swapping it is a single-file change.
- Colour and type are CSS custom properties on `:root`, so a brand shift moves tokens rather than components.
- `SITE_URL` stays an env var from day one, so the domain decision is deployment config, not source.

The residual rename cost is the wordmark artwork itself and any name-specific copy lines — small, and explicitly not zero. Everything structural survives.

No database, no external accounts, no ordering logic. Ends with the §33 review and a written summary of what's done and what remains.

---

## Verification (every phase)

- Drive the primary flow by hand at **390 px**, then desktop.
- Browser console clean; server logs clean.
- `npm run build` green; TypeScript clean; lint clean.
- From Phase 2: run migrations against a fresh database and verify the constraints actually reject bad data — a negative quantity, a double assignment, an underpaid capture, a second active assignment on one order.
- From Phase 3: E2E passes end to end.
- Before payments go live: register the webhook, send a real test event, confirm it was received *and processed*.
