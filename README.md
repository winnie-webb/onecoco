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
| `PHASE-1-NOTES.md` | Phase 1 close-out: what shipped, what was fixed, known gaps. |
| `app/` | Next.js App Router. `(marketing)` pages today. |
| `components/` | `ui/` primitives, `site/` chrome, `marketing/` sections. |
| `lib/brand.ts` | The only file containing the brand name. |
| `supabase/migrations/` | Schema. 7 migrations, applied in filename order. |
| `supabase/seed/jamaica.sql` | Montego Bay pilot configuration. Idempotent. |

## Running it

```
npm install
npm run dev
```

No environment variables are required for the marketing site. Copy
`.env.example` to `.env.local` when you need to point at a database.

Port 3000 is often taken on the original dev machine, so `.claude/launch.json`
uses 3100. `npm run dev` on its own uses 3000 as normal.

## Status

| Phase | State |
|---|---|
| 0 — Architecture | Done. `docs/ARCHITECTURE.md`. |
| 1 — Brand + landing | Done, verified at 375px and 1280px. |
| 2 — Schema, zones, catalogue | **Migrations written, NOT YET APPLIED to any database.** |
| 3+ | Not started. See the roadmap in `docs/ARCHITECTURE.md`. |

### Picking up Phase 2 on another machine

The migrations have never been run. They are unverified SQL until they are.

```
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then run `supabase/seed/jamaica.sql` against the project.

Things to check the first time they run, because they are the parts most
likely to bite:

- PostGIS resolves — the migrations install it into the `extensions` schema and
  set `search_path` accordingly.
- `auth.users` exists (it does on Supabase; `app_users` references it).
- The seed leaves the delivery zone **`CLOSED`** on purpose. Its polygon is a
  placeholder rectangle, not a surveyed boundary, and there is no confirmed
  vending permission for the beach yet.
- Tax is seeded at **0**, deliberately — a wrong non-zero rate silently
  overcharges every customer.

## Conventions

- Money is integer cents, everywhere. Never floats.
- No price is ever a literal in application code.
- Mobile first. Verify at 375px before desktop.
- Nothing is described as working until it has been run.
