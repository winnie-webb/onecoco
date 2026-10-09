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
- [ ] Terms, Privacy, Refund policy live and linked at checkout (T-5, F-5)
- [ ] Coconut supplier agreements (primary + backup) (F-3)

**Technology**
- [ ] Trunk = `main-mf4ule`; CI green; Next ≥ 16.3.8; `npm audit` no high/critical (T-3, T-7)
- [ ] Production Supabase (Pro) + Vercel (Pro); 20 migrations applied; seed run; env vars set; `NEXT_PUBLIC_SITE_URL` verified; `CRON_SECRET` set (T-2)
- [ ] RLS verified with anon key against production tables (orders, customers, payments, locations return nothing)
- [ ] Zone polygon surveyed; 6-point in/out/borderline pin test passed; `route_factor`, hours, stock set; zone flipped to OPEN only at go time (T-6)
- [ ] Admin and runner accounts created; MFA on admin; runner phone installed/tested
- [ ] WhatsApp Business number + real contact details in site (T-5)
- [ ] Error alerting on; backup restore tested once
- [ ] Dry run: 5 test orders end-to-end on the beach (cash), incl. "I moved", undeliverable, refund, pause

**Operations**
- [ ] 2 runners trained (SOP-1…7); on-call backup identified
- [ ] Equipment & signage at the cart; first stock delivered; cash float prepared
- [ ] Weather/pause rule agreed; incident contact list printed
- [ ] Weekly metrics dashboard bookmarked (`/admin/analytics`)

## Gate B — Soft public launch (card on)
- [ ] Card checkout live in production (PayPal and/or local gateway) (T-1)
- [ ] Webhook registered; real test event received **and** `processed_at` set; US$1 live payment captured and refunded
- [ ] Payment environment flag = live; verified
- [ ] Expiry/refund sweep for unaccepted orders live; zero-runner test refunds automatically (T-4)
- [ ] Resend domain verified; confirmation + delivered emails correct template (T-13)
- [ ] Rate limiter works across instances or risk accepted in writing (T-9)
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
- [ ] T-9 limiter · [ ] T-10 atomic RPCs · [ ] T-11 inventory decrement · [ ] T-12 cancel/refund edge cases + customer cancel · [ ] T-14 monitoring · [ ] T-15 CI tests + Playwright · [ ] T-17 runner offline/photo/push · [ ] T-18 admin hardening · [ ] T-19 PII retention verified · [ ] T-20 currency

## Compliance calendar (recurring)
- [ ] Payroll statutory remittances by the 14th monthly (verify with TAJ)
- [ ] GCT: review turnover monthly against J$15M threshold; register in time
- [ ] OIC registration renewal by 1 Dec each year
- [ ] COJ annual return; food-handler permits renewed annually
- [ ] Insurance renewal; supplier price review quarterly
