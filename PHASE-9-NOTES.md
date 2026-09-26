# Phase 9 — Partners, QR Attribution, Commissions, Group/Scheduled Orders

## Completed

- **`partners` / `partner_users` / `qr_codes` / `campaigns`** (already
  present since migration `0006_growth_ops.sql`) now have their first real
  consumers. A partner is a hotel/resort/tour operator/restaurant/event
  planner/other; `partner_users` links an `app_users` row (role `PARTNER`)
  to one partner org (MVP assumption: one partner per user, documented
  in `lib/auth/partner-guards.ts`).
- **`lib/growth/qr.ts`** — `resolveQrCode(code)`. §2's "one table and one
  URL parameter": an unresolvable, inactive, or out-of-campaign-window code
  is silently ignored, never blocks checkout. Wired into `createOrder()`
  (`lib/orders/create.ts`) and the public `POST /api/v1/orders` route via
  an optional `qrCode` field, and into the customer flow end-to-end —
  `/order?qr=<code>` → `LocationGate` → `CheckoutFlow` → the order body.
- **Admin partner management** (`/admin/partners`) — create a partner
  (name, type, home beach, commission rate in bps), invite a partner user
  (mirrors the existing runner-invite pattern: `auth.admin.createUser()`
  with a random temp password, rollback via `deleteUser` on any failure),
  and generate a QR code (`crypto.randomBytes(5).base64url`, one row per
  physical placement — "front desk", "beach chairs", etc.).
- **Partner portal** (`/partner/*`, its own root layout — desktop-first,
  unlike the runner PWA, since the real user is a hotel front-desk
  terminal, not a phone in a runner's pocket):
  - **Dashboard** — attributed order count, revenue (paid orders only),
    computed commission at the partner's rate. RLS is the filter (§16):
    no explicit `partner_id` clause in the query, `partner_attributed_
    orders` does that work.
  - **QR codes** — every code the partner owns, rendered as a real
    scannable PNG via the `qrcode` package (fully offline, no external
    API — a good fit for this sandbox's network restrictions), each
    encoding `{SITE_URL}/order?qr={code}`.
  - **Group orders** — a form to pre-order a quantity for a future
    timestamp (`POST /api/v1/partner/group-orders`), sharing `createOrder()`
    and `buildQuote()` rather than a parallel code path. Billed
    cash-on-delivery for now — there's no real invoicing concept yet, so
    `cash`/`CASH_DUE` is the closest honest fit, called out in the UI copy
    itself ("a real invoicing option is still an open business question,
    not a limit of this form") rather than pretended away.
- **`scheduled_for`** on `orders` gates dispatch: `isDispatchableNow =
  !scheduledFor || scheduledFor <= now`. A scheduled cash order stays at
  `fulfillment_status = PLACED` — not `AWAITING_RUNNER` — until its time
  arrives; see the bug below for why both the transition *and* the offer
  creation had to be gated, not just the offer creation.
- **`proxy.ts`** matcher extended to `/partner/:path*` (session refresh,
  same as `/admin` and `/runner`).

## Two real bugs, found only by running the full flow end-to-end

1. **Scheduled orders would have falsely tripped `orders_at_risk`.** First
   pass only gated the `createOffersForOrder()` call on
   `isDispatchableNow`, not the `PLACED → AWAITING_RUNNER` transition
   itself — so a group order scheduled three hours out would have shown
   as `AWAITING_RUNNER` immediately, and once its `accept_deadline_at`
   (now + `acceptWindowMinutes`) passed, incorrectly flagged
   `ACCEPT_WINDOW_BLOWN` hours before anyone should be looking for a
   runner. Caught before it ever ran, by re-reading the write path once
   more before testing — fixed by gating the transition too:
   `if (isCash && isDispatchableNow) { assertFulfillmentTransition(...); ... }`.
   Verified live: the group order placed in this phase's test landed at
   `fulfillment_status = PLACED` with **zero** `order_offers` rows, exactly
   as intended.
2. **`partner_users` had RLS enabled with zero policies** — carried
   forward from `0007_rls.sql`, which explicitly and correctly left it
   "service-role only" back when nothing client-side ever read it.
   Phase 9 changed that: `loadPartnerSession()`
   (`lib/auth/partner-guards.ts`) now reads `partner_users` under the
   signed-in partner's own RLS-scoped session, and three more policies
   added this phase (`partner_own_record` on `partners`, `partner_own_qr`
   on `qr_codes`, `partner_own_campaigns` on `campaigns`, plus
   `partner_attributed_orders` on `orders`) all `EXISTS`-subquery into
   `partner_users` too. Every one of them was silently returning zero rows
   — not an error, just nothing — because the subquery itself runs under
   the same restricted role and had no policy of its own ever granting it
   visibility. This is the same bug class as Phases 6 and 7's RLS gaps
   (found the same way both times: a real signed-in partner access token
   against `/rest/v1/partner_users`, `/orders`, `/qr_codes` returned `[]`
   for all three, even though the identical query under `service_role`
   was correct). Fixed with migration `0019_partner_users_self_read.sql`:
   `USING (user_id = (SELECT auth.uid()))`. Re-verified the same three
   endpoints with the same token afterward — all three now return the
   partner's real rows.

   Four real cross-phase RLS/serialization gaps now, across Phases 6, 7
   (×2), and 9 — the same lesson each time, worth repeating once more:
   **a query proven correct under `service_role` proves nothing about
   what an authenticated session actually sees.** Any new client-facing
   query, on any table, needs its own real-token check before being
   trusted — reading the migration is not a substitute for running it.

## Tested

Full flow driven against the real local database with Playwright, zone/
inventory/runner state temporarily opened as in prior phases (reverted
after, confirmed via `curl /api/v1/zones/resolve` → `"reason":"ZONE_
CLOSED"` afterward, matching the seed-committed state):

- Admin created a partner ("Playwright Beach Hotel", `HOTEL`, 5%
  commission), invited a partner user, generated a QR code with a
  placement label — all three round-tripped correctly to the database
  (verified via direct `psql`, not just the UI showing a success state).
- A customer visited `/order?qr=<code>` on a 390×844 mobile viewport,
  completed a real cash-on-delivery checkout. Confirmed via `psql` that
  the resulting order's `partner_id`/`qr_code_id` matched the QR code's
  owner.
- The partner signed in and saw the attributed order (`#1014`) on the
  dashboard, with the correct order count and (correctly) $0 commission,
  since the order's `payment_status` was still `CASH_DUE`, not yet
  `CASH_COLLECTED` — commission is computed only on actually-paid orders,
  not on cash orders merely placed.
- The QR codes page rendered a real, scannable PNG for the partner's code
  with its placement label.
- The partner submitted a group order for a future timestamp (qty 15).
  Confirmed via `psql`: `fulfillment_status = PLACED`, `scheduled_for` set
  correctly, zero `order_offers` rows — the dispatch gate holds.
- All test data (test order, customer, partner, partner user, QR code,
  auth user) deleted afterward; zone/inventory/runner state reverted to
  seed-committed values and re-verified live.
- `npx tsc --noEmit` clean. `npx eslint .` clean. `npx vitest run` — 19/19
  passing (no new isolable pure logic this phase; QR resolution, RLS, and
  the dispatch gate all need the database or a real session to mean
  anything, so they're exercised live above rather than mocked).
- `npm run build` green — 44 routes, including `/admin/partners`,
  `/partner/login`, `/partner/dashboard`, `/partner/qr-codes`,
  `/partner/group-orders`, and their three new API routes.

## Known gaps

- **No sweep job promotes a scheduled order when its time arrives.** A
  group order sits at `PLACED` forever unless something later calls
  `createOffersForOrder()` + the `PLACED → AWAITING_RUNNER` transition
  once `scheduled_for` is reached. A reasonable Phase 10 addition (a
  polling job or a `pg_cron` trigger); not built now since nothing in the
  architecture doc specifies the mechanism and guessing one felt riskier
  than documenting the gap plainly.
- **Group orders are cash-on-delivery only** — there is no invoicing
  concept for a partner org yet (§27's open questions don't cover this
  either). `cash`/`CASH_DUE` is the closest honest fit and is labeled as
  such in the UI; a real invoice/terms flow is a business decision, not
  an engineering one, and isn't guessed at here.
- **One partner per user, MVP-only.** `partner_users` is genuinely
  many-to-many in the schema (a hotel could have several staff logins),
  but `loadPartnerSession()` only ever reads the first linked row. Fine
  until a partner needs two staff accounts with different roles/access —
  not needed yet.
- **QR codes have no per-scan click tracking**, only attribution at order
  time. A partner sees "orders attributed," not "codes scanned but not
  converted." Consistent with the architecture's "one table and one URL
  parameter" framing of this feature as deliberately cheap.
- **Campaign date-windowing exists in `resolveQrCode()` but no admin UI
  creates a campaign yet** — `campaigns` table and its RLS policy are
  ready; a QR code can be linked to one via direct DB access only. Not
  needed for the pilot's day-one partner flow (a QR code without a
  campaign attributes indefinitely, which is the common case).

## Next: Phase 10

Analytics dashboards + Montego Bay pilot hardening. `order_events` and
PostHog instrumentation are already in place since Phase 2 (§25 note:
"Attribution columns ship on `orders` from day one even though partners
are Phase 9 — backfilling attribution is impossible" — already true,
confirmed this phase). §27.1 (pilot beach + operating permission) remains
the one blocker outside this codebase's control; route around it the same
way every earlier phase did — keep the seed `delivery_zones.service_
status = CLOSED` and build everything that doesn't depend on that answer.
