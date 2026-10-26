# 01 — Executive Assessment & Decision Brief

*Assessment date: 2026-10-09. Prepared from the repository (all branches), checks I ran (type-check, lint, tests, build, dependency audit) and web research (secondary sources; many gaps flagged). Nothing was deployed or changed in the application. Detail lives in docs 02–11.*

## What OneCoco is

An on-demand service that brings **fresh coconuts, opened cold, to tourists on a Montego Bay beach** within a promised 6–12 minutes, ordered from a phone. OneCoco itself operates it: staff runners, its own cart and sourcing, direct-to-customer revenue in **US dollars**, with hotel/villa partners distributing QR codes for a commission. It is not a marketplace. (Source: `docs/ARCHITECTURE.md`, schema, order/payment code.)

## Where it stands

**Software: far ahead of the business.** A well-designed full-stack app exists on branch `main-mf4ule` (Next.js 16 / Supabase+PostGIS / Vercel): customer ordering with zone/serviceability logic, server-priced quotes, guest tracking, runner PWA with race-safe dispatch and cash handling, admin console, partner QR/group orders, analytics, multi-beach support. It type-checks, lints, builds and passes its 19 unit tests. Its authors documented honestly what was never exercised against real services.

**Business: pre-launch, mostly unstarted.** No legal entity, permits, insurance, beach permission, suppliers, runners, polygons or payment account are evidenced anywhere. Both seeded delivery zones are `CLOSED` with placeholder rectangles and zero stock. Demand is unvalidated, the competitive price (informal vendors) is unknown, and the market is recovering from **Hurricane Melissa** (Jan–Aug 2026 visitors −17%; Montego Bay airport Aug −24%; ~9,000 rooms still closed).

## Is it ready to launch? No — and these are the reasons

| # | Blocker | Evidence |
|---|---|---|
| 1 | **No right to operate on a beach.** Doctor's Cave is a private club; Walter Fletcher is UDC-run. No permission, no vendor/health permits, no entity, no insurance. | doc 04 B-1…B-5, A-1 |
| 2 | **Customers cannot pay by card in production.** UI offers only `mock` (hard-disabled in production) and cash; PayPal server code exists but nothing calls it. | doc 02 T-1 |
| 3 | **Never run in production.** PayPal, webhooks, Resend, cron: zero live calls. | T-2 |
| 4 | **Paid orders nobody accepts are never refunded.** | T-4 |
| 5 | **No Terms/Privacy/Refund pages; placeholder contact details.** Data Protection Act registration pending. | T-5, doc 04 E-1 |
| 6 | **Zones are placeholders and closed; stock zero.** | T-6 |
| 7 | **Two divergent code lines**, and a critical `next` advisory. | T-7, T-3 |
| 8 | **Name and domain undecided.** | T-8 |

All are fixable in weeks. #1 is outside the code and sets the schedule.

## How we make money, and whether it works

Customer pays US$7 (Classic) + US$2 delivery (seed prices). Modeled contribution **US$6.27/order before shift pay (66%)**, **US$4.02 after** at 16 orders/day/beach. **A staffed beach breaks even at ~7 orders/day; a single beach carrying all overhead at ~14/day (~410 orders/month).** The unit economics are healthy; the risk is *volume per beach versus fixed staffing*, and the unverified US$9 price against informal vendors (price likely much lower — unknown).

Funding (modeled): **~J$1.8M to launch** (US$11.5k), **~J$2.3M for the first 90 days** cumulatively, **J$4.6M (Base) – J$6.0M (Conservative) peak** over 12 months. Base reaches ~US$92k revenue and a positive monthly run-rate by month 12 (US$2.5k/mo); Conservative never turns profitable in year 1; Aggressive (24 orders/day, 14 zones) is upside only.

## How we operate, acquire customers, and scale

- **Operate:** one cart + one employed runner (ideally an existing licensed vendor) per beach; founders cover permits, supply, cash; WhatsApp support; SOPs for open/close, cash, refunds, weather, incidents (doc 05).
- **Acquire:** hotel/villa QR + concierge, a visible runner at the beach entrance, WhatsApp and organic video, creators, referral; paid ads only if CAC ≤ US$3 (doc 07). First 100 customers in ~4 weeks after soft launch.
- **Scale:** **not** "14 parishes in 90 days". Only ~10 parishes have viable tourist beaches; Manchester and St Andrew are inland. Fastest credible path: 1 beach by Dec, a second after hard gates (~mid-Jan), 3–4 zones across St James/St Ann/Trelawny/Westmoreland by month ~6, all viable coastal parishes in 9–18 months with an asset-light vendor-partner model (doc 08).

## Phase 12 — Direct answers

1. **Launch today?** No. Blockers: permission/permits/entity/insurance (outside code); card payments unwired; unverified production; no expiry-refund sweep; no legal pages; closed placeholder zones; undecided name/domain.
2. **Fastest first paying customer:** ~**9 Nov 2026**, invite-only cash orders, *if* a beach operator agrees in writing within ~2 weeks. First public card-paying customer ~**1 Dec 2026**; season push 15 Dec.
3. **Minimum technical requirements:** trunk = `main-mf4ule`; upgrade Next; production Supabase+Vercel with migrations/seed verified; real polygons, hours, stock; for public launch: working card checkout + expiry/refund sweep; legal pages and a real WhatsApp/email; error alerts and a tested backup restore.
4. **Minimum legal/operational:** company + TRN + bank; permission to vend in writing; food-handler permits (and any health/municipal licence confirmed); employer registrations; OIC registration; liability insurance; terms/privacy/refund policy; 2 trained runners; coconut supplier(s); cart equipment; cash SOP.
5. **Money to launch:** **~J$1.8M (US$11.5k)** including 15% contingency and beach #1 setup; absolute minimum ~J$1.5M.
6. **First three months:** **~J$2.3M** cumulative (Base) to J$2.7M (Conservative), including launch costs.
7. **Charge:** US$7 Classic + US$2 delivery (US$9 delivered), US$12 Coco for Two with free delivery; run a 2-week price test (US$6+2 / US$8 all-in); floor US$6+1.50.
8. **Earn per transaction:** revenue ~US$9.52 (J$1,504); contribution US$6.27 before guaranteed shift pay, ~US$4.02 after at 16 orders/day (US$1.77 at 8/day).
9. **Break-even:** ~7 orders/day per beach (cover its staffing); ~14/day for one beach carrying all overhead (≈ 410/month); ~9/day per beach once central costs are shared by four.
10. **Best first location:** Montego Bay Hip Strip (St James), conditional on a written permission and an on-site check of post-hurricane conditions; scout Ocho Rios as fallback/second.
11. **First 100 customers:** free-first-delivery code, runner + QR at the beach entrance, 3–5 hotel/villa QR placements with concierge commission, WhatsApp, creator visits, referral, 2 group orders — doc 07 §5.
12. **Must exist before launch:** beach-operator agreement; coconut supplier + backup; runner(s) with permits; insurance; QR partner(s); payment account (for card stage); WhatsApp line.
13. **Postpone:** 3D/sticker customiser, live runner map, Stripe/Apple Pay, SMS, SEO city pages, multi-instance infra, batching, loyalty, additional SKUs, vehicles, extra staff.
14. **Fastest credible path to all 14 parishes:** it is not credible for all 14 (two are inland). For all *viable* coastal parishes: A (MoBay) → B (St Ann, Trelawny, Westmoreland, 2nd MoBay beach) → C (rest) over 9–18 months, each zone gated (doc 08).
15. **Capital for islandwide coverage:** indicative **J$12–16M (≈ US$86k)** for ~20 zones, released by gates; excludes beach-access fees and hurricane shocks.
16. **Top three failure reasons:** (a) no permission/incumbent pushback; (b) insufficient demand at the price in a recovering market, with fixed staffing idle; (c) operational unreliability (supply, finding customers, stranded paid orders).
17. **Ten actions now:** see below.

## The ten highest-priority actions (start Monday 12 Oct)

1. **Decide trunk branch** (`main-mf4ule`), port CI, upgrade Next/`npm audit fix` (1 day). *CTO*
2. **Write to / meet the beach operators** (Doctor's Cave club, UDC, NEPA/BCA, Western RHA, St James Municipal Corp) and get terms in writing. *OPR*
3. **Run the 7-day validation** (60 beachgoer interviews, vendor interviews, hotel/villa QR talks, 3 coconut quotes). *OPR*
4. **Secure funding commitment** of at least J$2.0M now, J$6.0M target. *Both*
5. **Engage attorney + accountant; incorporate** (name reservation first); open bank account. *OPR*
6. **Apply for PayPal business + one local gateway;** confirm settlement route. *OPR*
7. **Stand up production Supabase Pro + Vercel Pro and run the verification checklist.** *CTO*
8. **Decide the brand name/domain** before anything is printed. *Both*
9. **Build the T-4 expiry/refund sweep and the real card checkout** (sandbox first). *CTO*
10. **Hire/train runners (ideally existing vendors), book food-handler permits, get insurance quotes.** *OPR*

## Executive decision brief (one page)

| | |
|---|---|
| **Where we are** | Excellent software on one branch, no business infrastructure, unvalidated demand, recovering market. |
| **What's missing** | Beach permission, entity/permits/insurance, working card payment, production verification, expiry-refund sweep, legal pages, surveyed zones, supply and staff, name/domain. |
| **Before launch** | Gate list in `launch-readiness-checklist.md` — section A for Pilot-0, section B for public card launch. |
| **Cost** | ~J$1.8M to launch; ~J$2.3M through 90 days; fund J$6M for a 12-month cushion. |
| **How we make money** | US$9 delivered orders; ~US$4/order contribution at 16/day; break-even ≈ 7–14 orders/day depending on overhead load; partners via QR commissions; group orders. |
| **How we operate** | One cart + one employed runner per beach, founders on cash/supply/permits, WhatsApp support, SOPs, weekly metrics. |
| **How we acquire customers** | Hotel/villa QR, visible runner, WhatsApp, organic video, creators, referral; CAC ≤ US$3. |
| **How we scale** | Gate-driven, vendor-partner cells; viable coastal parishes in 9–18 months; not 14 in 90 days. |
| **What we do first** | Get the permission conversation and validation done in week 1 while engineering fixes the P0 list in parallel. If permission or demand fails, we learn it for ~J$100k instead of J$6M. |
