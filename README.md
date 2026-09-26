# One Coco

On-demand fresh coconut delivery to tourists on the beach. Launching in
Montego Bay, Jamaica.

> **The brand name is not final.** The codebase is built name-agnostic: the
> literal name appears in `lib/brand.ts` and nowhere else, and the logo lockup
> is `components/ui/Wordmark.tsx`. A rename is those two files.

## Where things are

| Path | What |
|---|---|
| `docs/ARCHITECTURE.md` | **Read this first.** Phase 0 — architecture, schema, flows, roadmap, risks, open questions. |
| `PHASE-1-NOTES.md` … `PHASE-4-NOTES.md` | Phase close-outs: what shipped, what was fixed, known gaps. |
| `app/(marketing)/` | Public site — landing, `/order` (location → cart → checkout), `/confirm`, `/track`. Own root layout (Header/Footer). |
| `app/(admin)/admin/` | Staff tool — login (unguarded) + `(protected)/{orders,zones,products,runners}`. Own root layout, no site chrome. |
| `app/(runner)/runner/` | Runner PWA — login + `(protected)/{today,offers,order/[id]}`. Own root layout, mobile-first. |
| `app/api/v1/*` | Route Handlers — customer-facing + `admin/*` / `runner/*` (staff-only, audited/guarded). |
| `components/` | `ui/` primitives, `site/` chrome, `marketing/` sections, `order/` (checkout flow), `admin/`, `runner/` (staff UI). |
| `lib/brand.ts` | The only file containing the brand name. |
| `lib/db/` | `client.ts` (service-role, server-only), `server.ts`/`browser.ts` (staff/runner auth, RLS-scoped), generated `types.ts`. |
| `lib/geo/`, `lib/pricing/`, `lib/settings.ts` | Zone resolution, serviceability gate, ETA, quote. |
| `lib/orders/` | Order creation/cancellation/runner transitions, the central status-transition maps, tracking, display copy. |
| `lib/dispatch/offers.ts` | Creates `order_offers` the moment an order becomes dispatchable (§6). |
| `lib/payments/` | `PaymentProvider` interface + `mock`/`cash`/`paypal` (unverified live, see `PHASE-5-NOTES.md`) providers, the four-check capture verifier. |
| `lib/auth/` | Staff + runner role/session guards (Server Components and Route Handlers). |
| `lib/analytics/events.ts` | Funnel events — no-ops until `NEXT_PUBLIC_POSTHOG_KEY` is set. |
| `lib/notifications/` | Email (Resend, unverified live) + console-sink fallback, templates. |
| `proxy.ts` | Refreshes the staff/runner auth session cookie on `/admin/*` and `/runner/*` (this Next.js version's renamed `middleware.ts`). |
| `supabase/migrations/` | Schema. 17 migrations, applied in filename order. |
| `supabase/seed/jamaica.sql` | Montego Bay pilot configuration. Idempotent. |

## Running it

```
npm install
npx supabase start      # local Postgres + PostGIS in Docker
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/seed/jamaica.sql
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the `NEXT_PUBLIC_SUPABASE_*` /
`SUPABASE_SERVICE_ROLE_KEY` values `npx supabase status` prints (only
`NEXT_PUBLIC_SITE_URL` is required for the marketing-only pages).

Port 3000 is often taken on the original dev machine, so `.claude/launch.json`
uses 3100. `npm run dev` on its own uses 3000 as normal.

## Status

| Phase | State |
|---|---|
| 0 — Architecture | Done. `docs/ARCHITECTURE.md`. |
| 1 — Brand + landing | Done, verified at 375px and 1280px. |
| 2 — Schema, zones, catalogue | Done. Migrations applied + constraint-verified against a real local database; zone/serviceability resolution and location capture live at `/order`. `PHASE-2-NOTES.md`. |
| 3 — Cart, checkout, tracking | Done. Real quote/order/mock-payment/tracking flow, proven end to end in a real browser. `PHASE-3-NOTES.md`. |
| 4 — Admin | Done. Staff auth, live order board (Realtime) + at-risk view, zone pause, products, runners. `PHASE-4-NOTES.md`. |
| 5 — Real payments, email | Code done, unverified live. PayPal + Resend written to spec with pure logic unit tested (`npm test`); this sandbox has neither account nor network egress to either host. `PHASE-5-NOTES.md`. |
| 6 — Runner PWA | Done. Login, shift, Realtime offers, race-safe accept, pickup/arriving/delivered/undeliverable, cash settlement. Proven end to end; found and fixed a real cross-phase RLS bug along the way. `PHASE-6-NOTES.md`. |
| 7 — Runner GPS + live map | Done, schematic map. GPS during active delivery only (§17), proximity on offers, admin live view. No map-tile host (Mapbox/OSM/unpkg) reachable from this sandbox — verified, not assumed — so positions render on a plain SVG radar instead of real tiles. Found and fixed two more cross-phase RLS/serialization bugs. `PHASE-7-NOTES.md`. |
| 8 — Build Your Coco | **Done.** Real, live SVG preview wired into the actual `/order` picker (not a separate demo) plus an interactive marketing playground at `/build-your-coco`. `PHASE-8-NOTES.md`. |
| 9+ | Not started. See the roadmap in `docs/ARCHITECTURE.md`. |

### Local database

```
npx supabase start
npx supabase status     # prints the URL + keys for .env.local
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/seed/jamaica.sql
```

Things worth knowing:

- PostGIS resolves — the migrations install it into the `extensions` schema and
  set `search_path` accordingly.
- `auth.users` exists (it does on Supabase; `app_users` references it).
- The seed leaves the delivery zone **`CLOSED`** on purpose. Its polygon is a
  placeholder rectangle, not a surveyed boundary, and there is no confirmed
  vending permission for the beach yet — so `/order` will honestly report
  "not open right now" for any real location on the pilot beach until that
  changes.
- Tax is seeded at **0**, deliberately — a wrong non-zero rate silently
  overcharges every customer.
- **No production Supabase project is linked yet.** `npx supabase link
  --project-ref <ref> && npx supabase db push` against a real project,
  then re-run the seed, is still pending an account (§27.1 also gates
  whether the seed's zone should ever actually open).

### Creating a local admin account

`/admin` needs a staff account, and deliberately isn't seeded with one (a
hardcoded admin password in committed SQL is exactly the kind of default
credential that gets forgotten and shipped to production). Create one
against your local Supabase instance:

```
curl -s -X POST http://127.0.0.1:54321/auth/v1/admin/users \
  -H "apikey: <SERVICE_ROLE_KEY>" -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<choose one>","email_confirm":true}'
```

Then give the returned user's `id` the `ADMIN` role:

```sql
INSERT INTO app_users (id, email, display_name, role, active)
VALUES ('<id from above>', 'admin@example.com', 'Local Admin', 'ADMIN', true);
```

### Creating a local runner account

Same idea, `role: 'RUNNER'`, plus a `runners` row (the admin `/admin/runners`
page does all of this for you against a real signed-in admin session — this
manual path is only for when you need one before an admin account exists):

```sql
INSERT INTO app_users (id, email, display_name, role, active)
VALUES ('<id from the admin API call above>', 'runner1@example.com', 'Local Runner', 'RUNNER', true);

INSERT INTO runners (user_id, name, phone, home_beach_id, active)
SELECT '<same id>', 'Local Runner', '+1', b.id, true FROM beaches b WHERE b.slug = 'doctors-cave-beach';
```

## Conventions

- Money is integer cents, everywhere. Never floats.
- No price is ever a literal in application code.
- Mobile first. Verify at 375px before desktop.
- Nothing is described as working until it has been run.
- `npm test` runs the Vitest suite (pure logic only — order state
  transitions, PayPal response parsing, email request shaping). Anything
  that touches the database is verified by hand against a real local
  Supabase instance instead; see each phase's notes for what was run.
