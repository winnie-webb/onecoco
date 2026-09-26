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
| `PHASE-1-NOTES.md`, `PHASE-2-NOTES.md`, `PHASE-3-NOTES.md` | Phase close-outs: what shipped, what was fixed, known gaps. |
| `app/` | Next.js App Router. Marketing pages, `/order` (location → cart → checkout), `/confirm`, `/track`, `api/v1/*`. |
| `components/` | `ui/` primitives, `site/` chrome, `marketing/` sections, `order/` (location gate, picker, checkout, tracking). |
| `lib/brand.ts` | The only file containing the brand name. |
| `lib/db/` | Supabase clients + generated types (`types.ts`, regenerate after any migration). |
| `lib/geo/`, `lib/pricing/`, `lib/settings.ts` | Zone resolution, serviceability gate, ETA, quote. |
| `lib/orders/` | Order creation, the central status-transition maps, tracking, display copy. |
| `lib/payments/` | `PaymentProvider` interface + `mock`/`cash` providers, the four-check capture verifier. |
| `lib/analytics/events.ts` | Funnel events — no-ops until `NEXT_PUBLIC_POSTHOG_KEY` is set. |
| `supabase/migrations/` | Schema. 9 migrations, applied in filename order. |
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
| 3 — Cart, checkout, tracking | **Done.** Real quote/order/mock-payment/tracking flow, proven end to end in a real browser. `PHASE-3-NOTES.md`. |
| 4+ | Not started. See the roadmap in `docs/ARCHITECTURE.md`. |

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

## Conventions

- Money is integer cents, everywhere. Never floats.
- No price is ever a literal in application code.
- Mobile first. Verify at 375px before desktop.
- Nothing is described as working until it has been run.
