# Master Launch-Readiness Checklist

Update as work progresses: change `[ ]` to `[x]` and add date + initials. A gate is passed only when **every** box in its section is ticked. Source IDs refer to docs 02 (T-), 04 (A–F), 09 (R-), 10 (D-).

## Gate 0 — Founder decisions (by Day 14)
- [ ] D-01 trunk branch chosen · [ ] D-02 beach target & operator contact · [ ] D-03 name/domain · [ ] D-05 payment rail · [ ] D-06 currency policy · [ ] D-07 price · [ ] D-08 runner employment structure · [ ] D-12 funding committed (≥ J$2.0M)

## Gate A — Pilot-0 (invite-only, cash) — all must be ticked
**Permission & legal**
- [ ] Operator permission to vend/deliver **in writing** (B-1) (terms, hours, fee, area)
- [ ] NEPA/BCA, health, municipal licensing questions answered in writing (B-2, B-4, B-5)
- [ ] Company incorporated; TRN; bank account (A-1, A-3, A-4)
- [ ] Employer registrations (PAYE/NIS/NHT/Ed Tax/HEART) (A-5)
- [ ] OIC data-controller registration submitted (E-1)
- [ ] Liability insurance bound; certificate on file (F-1)
- [ ] Food-handler permits for every handler (B-3)
- [ ] Runner employment contracts signed; code of conduct (D-1, F-4)
- [ ] Terms, Privacy, Refund policy live and linked at checkout (T-5, F-5) — *pages + checkout consent line built 2026-10-21 · CC as DRAFTS; ticks when counsel approves and `lib/legal.ts` `reviewed: true`*
- [ ] Coconut supplier agreements (primary + backup) (F-3)

**Technology** — see "Technical status" at the end of this file for what each item needs from you.
- [ ] Trunk = `main-mf4ule`; CI green; Next ≥ 16.3.8; `npm audit` no high/critical (T-3, T-7) — *code done 2026-10-21 · CC on `claude/nice-hypatia-curprj` (Next 16.3.8, prod audit clean, `ci.yml` ported); ticks when that branch is merged as `main` and CI shows green*
- [ ] Production Supabase (Pro) + Vercel (Pro); 20 migrations applied; seed run; env vars set; `NEXT_PUBLIC_SITE_URL` verified; `CRON_SECRET` set (T-2)
- [ ] RLS verified with anon key against production tables (orders, customers, payments, locations return nothing) — *run `npm run check:production` (script added 2026-10-21 · CC)*
- [ ] Zone polygon surveyed; 6-point in/out/borderline pin test passed (`npm run check:zones -- <site> <pins.json>`); `route_factor`, hours, stock set; zone flipped to OPEN only at go time (T-6)
- [ ] Admin and runner accounts created; MFA on admin; runner phone installed/tested
- [ ] WhatsApp Business number + real contact details in site (T-5) — *site side done 2026-10-21 · CC: set `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_WHATSAPP` in Vercel*
- [ ] Error alerting on; backup restore tested once — *alerting built 2026-10-21 · CC (set `ALERT_WEBHOOK_URL`; point an uptime monitor at `/api/v1/health`); restore test is yours*
- [ ] Dry run: 5 test orders end-to-end on the beach (cash), incl. "I moved", undeliverable, refund, pause

**Operations**
- [ ] 2 runners trained (SOP-1…7); on-call backup identified
- [ ] Equipment & signage at the cart; first stock delivered; cash float prepared
- [ ] Weather/pause rule agreed; incident contact list printed
- [ ] Weekly metrics dashboard bookmarked (`/admin/analytics`)

## Gate B — Soft public launch (card on)
- [ ] Card checkout live in production (PayPal and/or local gateway) (T-1) — *PayPal checkout built 2026-10-21 · CC (redirect → return page → server capture; card button appears once `PAYPAL_CLIENT_ID/SECRET` are set); needs sandbox then live test*
- [ ] Webhook registered; real test event received **and** `processed_at` set; US$1 live payment captured and refunded
- [ ] Payment environment flag = live; verified
- [x] Expiry/refund sweep for unaccepted orders live; zero-runner test refunds automatically (T-4) — *2026-10-21 · CC: built and verified against local Postgres+PostGIS with the mock provider (expire → refund → email; cash voided; abandoned unpaid cleared; late capture refused). Also fixed: Vercel Cron calls GET but the sweep only accepted POST, so it would never have run. Re-run the zero-runner test on production with PayPal sandbox.*
- [ ] Resend domain verified; confirmation + delivered emails correct template (T-13) — *templates fixed 2026-10-21 · CC (delivered receipt, expiry notice, tracking link in confirmation); domain verification is yours*
- [x] Rate limiter works across instances or risk accepted in writing (T-9) — *2026-10-21 · CC: Postgres-backed counter (migration 0021), platform IP header; verified 10/min → 429*
- [ ] ≥ 50 successful Pilot-0 orders; on-time ≥ 80%; no unresolved safety incident
- [ ] PostHog funnel events live (T-16)
- [ ] ≥ 3 QR partners signed and cards placed
- [ ] Price decision after test recorded

## Gate C — Season launch (15 Dec)
- [ ] Beach #1 ≥ 9 orders/day trailing 14 days (if season data available)
- [ ] Second runner on call; stock plan for peak days; cash handling for peak
- [ ] Reopening hotels (Sandals MoBay etc.) approached

## Gate D — Open an additional zone (each time)
- [ ] All gates in doc 08 §5 met on the existing zone
- [ ] Operator permission in writing; polygon surveyed; vendor-partner hired/trained
- [ ] ≥ 2 QR partners pre-signed; setup budget (US$1.7k) + 12 weeks fixed costs in bank
- [ ] 5 dry-run orders passed
- [ ] Decision logged (date, metrics, approvers)

## Post-launch P1 backlog (tick as shipped)
- [x] T-9 limiter · [ ] T-10 atomic RPCs · [ ] T-11 inventory decrement · [ ] T-12 cancel/refund edge cases + customer cancel · [ ] T-14 monitoring · [ ] T-15 CI tests + Playwright · [ ] T-17 runner offline/photo/push · [ ] T-18 admin hardening · [ ] T-19 PII retention verified · [ ] T-20 currency

## Compliance calendar (recurring)
- [ ] Payroll statutory remittances by the 14th monthly (verify with TAJ)
- [ ] GCT: review turnover monthly against J$15M threshold; register in time
- [ ] OIC registration renewal by 1 Dec each year
- [ ] COJ annual return; food-handler permits renewed annually
- [ ] Insurance renewal; supplier price review quarterly

---

## Technical status (2026-10-21)

Code work done on branch `claude/nice-hypatia-curprj` (based on `main-mf4ule`). Verified locally: `tsc`, lint, 25 unit tests, production build, prod `npm audit` clean; all 21 migrations + seed applied to Postgres 16 + PostGIS behind PostgREST; card (mock), cash, expiry, refund, abandoned-checkout, late-capture and rate-limit paths driven through the real API; checkout driven in a 390 px browser. **Not verified: anything against real PayPal, Resend or Vercel** — no accounts/network for those here.

| Item | Built | What it needs from you |
|---|---|---|
| T-7 trunk + CI | `.github/workflows/ci.yml` (audit, tsc, lint, test, build) | Merge this branch into `main` (it replaces the marketing-only `main`; the 3D customiser stays in history on `main`'s old commits) |
| T-3 deps | Next 16.3.8, `npm audit fix` | — |
| T-1 card checkout | PayPal redirect flow, `/order/paypal-return`, capture by PayPal token, 10 s timeouts, already-captured recovery, retry-safe start; mock never offered in production | PayPal business account; set `PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID/ENVIRONMENT`; register webhook `https://<domain>/api/v1/webhooks/paypal`; sandbox order → live US$1 capture + refund |
| T-4 expiry | `lib/orders/expire.ts` in the sweep; settings `expiry_grace_minutes` (4), `unpaid_abandon_minutes` (30); accept window restarts at payment | `CRON_SECRET` set; Vercel **Pro** (5-minute cron) |
| T-5 policies + contact | `/terms`, `/privacy`, `/refunds`, `/contact`, footer Help column, checkout consent line, env-driven contact details | Attorney review of the drafts → set `reviewed: true` in `lib/legal.ts`; set contact + `NEXT_PUBLIC_LEGAL_ENTITY` env vars |
| T-9 rate limit | Postgres limiter, fails open | — |
| T-12 (part) | Refund failures recorded (`refunds.status=FAILED`, `audit_log REFUND_FAILED`), alerted, shown to ops on cancel; cash cancels void `CASH_DUE` | Customer self-cancel still not built |
| T-13 (part) | Delivered receipt, expiry email, tracking link in confirmation | Rating UI still not built |
| T-14 (part) | `instrumentation.ts` error alerts, `/api/v1/health`, alerts on failed refund/sweep | `ALERT_WEBHOOK_URL`; uptime monitor on `/api/v1/health`; one backup restore test |
| Go-live tooling | `npm run check:production` (env, silent-failure settings, anon-key RLS probe, health), `npm run check:zones` (pin test) | Run both against production before flipping the zone to OPEN |
