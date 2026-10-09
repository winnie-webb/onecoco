# 02 — Technical & Product Gap Audit

*Audit date: 2026-10-09. Evidence base: the code itself, plus checks I ran. Where I did not run something, it says so.*

## 0. Which code is "OneCoco"? (read this first)

The repository has **two diverging lines of development**, both branching from commit `19400b3` (Phase 0–2 schema):

| Branch | What it contains | State |
|---|---|---|
| `origin/main` (and this working branch `claude/gallant-cori-wxsarr`) | Marketing site + a **3D "Build Your Coco" customiser with printed-sticker preview**. No database code, no ordering, no admin, no runner app. Own CI workflow (`.github/workflows/ci.yml`), `node --test`. | Marketing only. **Cannot take an order.** |
| `origin/main-mf4ule` | Phases 2–11: Supabase wiring, zone resolution, catalogue, quote → order → payment → tracking, admin console, runner PWA, PayPal/Resend code, partners/QR, analytics, multi-beach, cron sweep. 46 routes, 20 migrations. A **different, simpler** "Build Your Coco" (Phase 8). **No CI workflow.** | The real application. |

Both lines implemented "Build Your Coco" independently; `components/order/` differs by ~1,000 lines. They have never been merged. **This is a P0 decision (D-01):** the operational app lives on `main-mf4ule`; `main` is not deployable as a business. Everything below audits `main-mf4ule` unless stated. Recommendation: make `main-mf4ule` the trunk, port only the *CI workflow* from `main`, and **defer the 3D/sticker customiser** (see §5) rather than reconcile two builders before launch.

## 1. What I verified myself vs what is claimed

| Check (on `main-mf4ule` @ `fa5fa22`, clean `npm ci`) | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| `vitest run` | ✅ 19/19 pass (3 files: order state machines, PayPal capture parsing, Resend request builder) |
| `next build` | ✅ succeeds, 46 routes (needs Supabase env vars present at build) |
| `npm audit --omit=dev` | ❌ **3 vulns: 1 critical (`next` 16.3.5), 2 high (`sharp`, `source-map-js`)** |
| Runtime against a real Postgres/Supabase, real PayPal, Resend, Vercel | ⛔ **Not re-run in this audit** (no Supabase/Docker stack here; outbound payment hosts are blocked in the sandbox). |

The `PHASE-*-NOTES.md` files claim hand-testing against a local Supabase (zone resolution, order idempotency, price-drift 409, cash flow, dispatch scoping across two beaches, sweep, analytics, rate-limit boundaries). They are unusually candid about what was *not* verified, and I found no contradiction between notes and code in the areas I read. But they are the previous author's claims, not my observations. **Anything touching real money (PayPal, Resend, webhooks, cron) has never executed against the real service — by the notes' own admission.**

## 2. Business-flow summary (what the code actually does)

Tourist on a Montego Bay beach → `/order` → one-shot GPS → `POST /zones/resolve` (PostGIS `ST_Covers` against a delivery-zone polygon, serviceability gate: zone `OPEN` + hours + ≥1 runner `AVAILABLE` + stock>0) → pick product/customisation → server-computed quote (client never sends a price; persisted `quotes` row; re-quote on order creation → `409 PRICE_CHANGED`) → guest checkout (name, phone, email, landmark, description) → order created (idempotent key; 4-digit `delivery_code`; hashed track token) → pay → `AWAITING_RUNNER` → `order_offers` to all `AVAILABLE` runners at that beach → first-to-accept wins (DB partial-unique index) → runner `PICKED_UP → ARRIVING → DELIVERED` (customer shows 4-digit code; cash settled into `shift_cash`) → customer polls `/track/:token` every 5 s. Admin sees a live board with an `at_risk` view, can pause zones, edit products/prices, manage runners/partners, cancel+refund, see analytics. Partners get QR codes + group (scheduled, cash) orders.

The design is sound and unusually careful for an MVP: three orthogonal status tracks, DB-trigger audit trail, integer cents, price-drift check, server-side capture verification (binding + amount), RLS on every table, hashed tokens, `no-referrer`, honest ETA ranges, serviceability gate, location retention sweep.

## 3. Feature status matrix

Legend: ✅ works as designed (code-read + prior-author test) · ⚠️ works but gaps · ❌ missing/blocked · 🔒 cannot be verified without external account.

| Area | Status | Notes |
|---|---|---|
| Landing + marketing pages | ✅ | Static, a11y-minded, measured payload. Missing: real photography, OG image, city/beach SEO pages, **legal pages**, real contact details (`hello@example.com`, empty WhatsApp/Instagram in `lib/brand.ts`). |
| Location capture + zone resolve | ✅ | Manual fallback for denied permission is partly there ("leave your email"); no beach-picker fallback. |
| Catalogue / quote / pricing | ✅ | Prices in **USD**; seed: Classic $7, Coco for Two $12, delivery $2/zone, name +$2, lime +$1, extra water +$2. Tax seeded **0**. |
| Order creation | ⚠️ | Idempotent and price-checked, but **not transactional** (order, items, customisations, location are separate inserts → orphan/partial orders on mid-flight failure). |
| **Card payment in production** | ❌ **P0** | See T-1. |
| Cash on delivery | ✅ | Goes straight to `AWAITING_RUNNER/CASH_DUE`. USD-priced; no JMD rate handling. |
| Guest tracking | ✅ | Polling, no coordinates leaked, identical 404s, `no-referrer`. |
| Customer self-cancel / refund request | ❌ | Only ops can cancel (`/admin/orders/:id/cancel`). No customer-facing path. |
| Dispatch / accept | ✅ | Race-safe in SQL. First-to-tap cherry-picking risk noted by author; fine for 1–2 runners. |
| Runner PWA | ⚠️ | Login, shift, offers, transitions, cash. **No offline queue, no delivery photo upload, no push notification** (runner must have the app open). |
| Admin console | ⚠️ | Orders board, zones (pause/status only — **no polygon editor**), products, runners, partners, analytics, map (schematic; Mapbox unverified). Not mobile-first by design (a later commit made it "mobile-friendly"). **No inventory screen/stock decrement.** |
| Partner portal / QR / group orders | ✅ | Group orders are cash-only; no invoicing. |
| Notifications | ⚠️ | Email only (Resend, unverified live). No SMS/WhatsApp. `DELIVERED` sends the wrong template (`order_confirmation`). |
| Analytics | ⚠️ | In-app admin dashboards real; PostHog funnel is a no-op until a key is set. `get_coco_click`, `checkout_started`, `payment_succeeded`, `delivered` events not instrumented. |
| Reviews / ratings | ❌ | Table exists, no UI. Needed for trust and for the "first 100" feedback loop (P1). |
| Tips | ❌ | Deliberately absent (payroll question). |
| Cron sweep | ⚠️ | Promotes scheduled orders + truncates stale locations. **Does not expire/refund unaccepted orders** (T-4). `*/5` cron needs a paid Vercel plan. |
| Observability / backups | ❌ | No error tracking, no uptime/alerting, no documented backup/restore. |
| CI/CD | ❌ on this branch | `ci.yml` exists only on `main`. |

## 4. Findings register

Format: **ID · Priority · Evidence → Impact → Fix · Effort · Depends · Acceptance.** Effort is developer-days for someone who knows Next.js/Supabase (a contractor, or the founders if technical).

### P0 — launch blockers

**T-1 · P0 · Customers cannot pay by card in production.**
Evidence: `components/order/CheckoutFlow.tsx` offers only `"mock" | "cash"`; `app/api/v1/orders/route.ts` rejects any `paymentProvider` other than `mock`/`cash`; `lib/payments/mock.ts` throws when `NODE_ENV==="production"`; no component references PayPal (`grep -ril paypal components app` → none). The PayPal provider and webhook exist server-side but nothing in the UI starts a PayPal payment.
Impact: in production the "pay by card" button creates an `UNPAID` order, then `payments/start` 500s. Only cash works. For a US-dollar tourist product, no card = lost conversions and a messy dead-order queue.
Fix: wire a real checkout (PayPal Smart Buttons/redirect, **or** a Jamaican gateway such as WiPay — see doc 03 §2), allow `paypal` in the orders route, remove `mock` from production UI, expire abandoned `UNPAID` orders. Add a request timeout to PayPal `fetch` calls (none today).
Effort: 4–6 d + sandbox testing. Depends: D-05 (gateway choice), merchant account. Acceptance: sandbox and then a live US$1 test order captured, webhook shows `processed_at` set, refund works, underpaid-capture test rejected.

**T-2 · P0 · Nothing has ever run against production infrastructure.**
Evidence: PHASE-5/10 notes: PayPal, Resend, webhook signature verification, Vercel cron, Mapbox, PostHog "never made a successful live call". `.env.example` lists the go-live checks (site URL, sandbox/live flag, webhook registered) as "blocking, not done".
Fix: provision Supabase (Pro), Vercel (Pro), apply 20 migrations to a fresh project, seed, run the go-live checklist in `launch-readiness-checklist.md` end-to-end with a real phone on a real beach. Effort: 2–3 d. Acceptance: the checklist section "Production verification" is fully ticked.

**T-3 · P0 · Dependency vulnerabilities.**
Evidence: `npm audit`: `next` range `>=16.2.0 <16.3.6` RCE in `next/og` `ImageResponse` (critical), plus moderate cache-poisoning/Draft-Mode advisories fixed in `16.3.8`; `sharp` high (librsvg CVE); `source-map-js` high (DoS). I grepped: the app does **not** use `next/og`/`ImageResponse`, so the critical one is not directly reachable today — but an OG image is on the to-do list and compliance reviewers will not read that nuance.
Fix: upgrade `next`/`eslint-config-next` to ≥16.3.8, `npm audit fix`, re-run build/tests; add `npm audit --omit=dev --audit-level=high` to CI. Effort: 0.5 d. Acceptance: audit clean at high+.

**T-4 · P0 (once card is live) · Unaccepted paid orders never expire or refund.**
Evidence: `ARCHITECTURE.md` §5 says `EXPIRED` is "swept by cron against `accept_deadline_at`, auto-refunding and notifying". `app/api/v1/system/sweep/route.ts` does only scheduled-order promotion and location truncation; `EXPIRED` is never written (grep).
Impact: a customer pays, no runner accepts (runner offline, zone just closed, app closed), money held, no update, chargeback risk. The notes themselves say this "happens in week one".
Fix: sweep step: `AWAITING_RUNNER` past `accept_deadline_at` → alert ops at T-2 min → `EXPIRED` + refund + email; also re-offer. Effort: 1.5 d. Acceptance: test with zero runners on shift: order auto-refunds and customer sees "couldn't find a runner — refunded".

**T-5 · P0 · No legal/consumer pages and placeholder contact details.**
Evidence: no terms/privacy/refund route; footer has none; `lib/brand.ts` contact is `hello@example.com`, WhatsApp/Instagram empty.
Impact: the Data Protection Act 2020 requires a privacy notice for collecting location/phone/email; PayPal and most gateways require published refund/contact policies; customers have no support channel. Fix: attorney-drafted Terms, Privacy, Refund & cancellation, "Contact"; WhatsApp Business number; footer links; checkout consent line. Effort: 1 d dev + legal (doc 04). Acceptance: pages live, linked from checkout, contact reachable.

**T-6 · P0 (data) · Delivery zones are placeholder rectangles and ship `CLOSED`.**
Evidence: `supabase/seed/jamaica.sql` header: "THE ZONE POLYGON IS A PLACEHOLDER". Both beach polygons are ~150 m × ~200 m rectangles; there is **no polygon editor** (zones are WKT in SQL). Inventory seeded at 0; zone `CLOSED`.
Fix: walk each beach with a GPS app, record the real permitted boundary (incl. property lines), write the polygon via SQL migration/seed, set `route_factor` from timed test walks, set inventory and hours, then flip to `OPEN`. Effort: 1 d field + 0.5 d dev. Depends: D-02 (permission). Acceptance: GPS pin dropped at 6 known points returns correct in/out/borderline.

**T-7 · P0 · Branch divergence** — see §0. Effort: 0.5 d to adopt `main-mf4ule` as trunk + port CI.

**T-8 · P0 · Brand name and domain undecided.** `onecoco.com` is held by a domain investor (per Phase 0 notes, 2026-09). `NEXT_PUBLIC_SITE_URL` drives PayPal return URLs — wrong value fails *silently*. Cheap now, expensive after printing QR codes and carts. Decide (D-03) before any printing.

### P1 — immediately post-launch (first 2–4 weeks)

| ID | Finding → Fix | Effort |
|---|---|---|
| T-9 | **In-memory rate limiter** (`lib/security/rate-limit.ts`) is per-lambda on Vercel — effectively no limit; `x-forwarded-for` trusted blindly. → Upstash/Vercel KV or Postgres-counter limiter; use platform-provided IP. | 1 d |
| T-10 | **Multi-statement state changes not atomic** (order create; runner `DELIVERED`: status → assignment → GPS delete → cash settle → `shift_cash` read-modify-write, which can lose an update if two deliveries finish together). → move to Postgres RPC functions in one transaction. | 3 d |
| T-11 | **Inventory is never decremented** (`qty_reserved` unused; only a `>0` check). → decrement on order, restock screen in admin, low-stock auto-pause. Manual stock-setting is acceptable for week 1. | 2 d |
| T-12 | **Cancel/refund edge cases**: refund failure is swallowed (order shows cancelled, payment still `CAPTURED`); no partial refunds in UI; no customer-initiated cancel. → surface failures to ops, add customer cancel-before-pickup with code. | 2 d |
| T-13 | **Wrong email template** on `DELIVERED`; no review prompt. → "delivered + rate us + receipt" template; add rating UI (table exists). | 1 d |
| T-14 | **No monitoring**: Sentry (or Vercel logs + alerts), uptime check on `/api/v1/zones/resolve`, alert on sweep failure, Supabase backups (Pro daily; PITR add-on) with a *tested* restore. | 1.5 d |
| T-15 | **CI**: port `ci.yml` (tsc, lint, test, build, audit) to trunk. Add pricing/serviceability tests with a seeded test DB; add 1 Playwright happy path at 390 px. | 3 d |
| T-16 | **PostHog funnel** keys + missing events (`checkout_started`, `payment_succeeded`, `delivered`, `get_coco_click`). | 1 d |
| T-17 | **Runner app**: offline queue for transitions, camera upload for delivery photo, web-push or WhatsApp ping for new offers. | 4 d |
| T-18 | **Admin hardening**: MFA for staff accounts; audit-log coverage check; zone polygon editor (or documented SQL runbook). | 3 d |
| T-19 | **Guest PII**: confirm retention job runs (needs `CRON_SECRET` + paid cron); document deletion-on-request procedure (DPA 2020 data-subject rights). | 1 d |
| T-20 | **Currency**: decide cash currency + posted JMD rate (`fx_rate_used` column); show JMD price for Jamaican residents. | 1–2 d |
| T-21 | **Mapbox/static map & real map** only if runners prove hard to find; otherwise leave. | — |

### P2 — growth requirements
Multi-instance-safe infra (shared limiter, queue for webhook second-pass); push-assignment/batching for >3 runners per zone; per-beach settings (`settings` is global); SEO city/beach pages (`/montego-bay/...`) with JSON-LD; WhatsApp ordering/notifications via an approved BSP; Stripe/Apple Pay path (needs foreign entity, see doc 03); partner invoicing & commission payout; campaigns UI; data warehouse export; load test (~50 concurrent beach users on 3G).

### P3 — future
3D customiser + printed stickers, live runner map (Mapbox), loyalty, gifting, inventory forecasting, non-coconut SKUs, multi-country.

## 5. UI/UX review (mobile-first, Jamaican beach context)

I did not drive the UI in a browser in this audit; the following is code-read plus the prior author's 375/390 px screenshots. Treat as hypotheses to confirm on a real phone in sun glare on beach data.

- **Strengths:** zero-JS marketing menu, one-variable font, big tap targets, 16 px inputs, honest "not open right now" state with reason, ETA as a range, delivery-code + landmark + clothing-description prompts (the right answer to the "last 20 metres" problem).
- **Conversion risks:** (1) the primary CTA leads to a **location-permission gate** before the customer has seen price — show the menu and price first, ask for location at checkout; (2) while the zone is `CLOSED` every visitor hits a dead end — put *"opens daily 9–5 at [beach]"* and WhatsApp on that screen; (3) **no card option** (T-1); (4) trust: no photography, no reviews, no named person, no phone number; (5) price shown only in USD — locals and cruise passengers with JMD will bounce; (6) email is mandatory but tourists read WhatsApp — make email optional, phone mandatory, and send the tracking link by WhatsApp/SMS as well (international SMS cost is a real constraint noted in Phase 0).
- **Not recommended:** a redesign. The brand system is coherent. Spend on photography and copy, not layout.
- **Defer the customiser.** "Build Your Coco" (name/message/design stickers) adds a print-and-apply step inside a ~10-minute delivery promise, a second inventory (stickers), and a labour step per order. Keep the simple Phase 8 extras (name text, lime, extra water) as *add-ons the runner writes with a marker*, or drop personalisation for the first 30 days. Revisit when ≥25% of customers ask for it.

## 6. Architecture, security and scalability assessment

- **Stack:** Next.js 16 App Router, React 19, Tailwind 4, Supabase (Postgres 17 + PostGIS, Auth, RLS, Realtime for staff), Vercel, Resend, PayPal Orders v2. Sensible and cheap. Note `AGENTS.md`: this Next.js has breaking changes (`proxy.ts` replaces `middleware.ts`) — keep contractors aware.
- **Data integrity:** strong (CHECK constraints, partial unique indexes, trigger-written event log). Weakness is *application-level* multi-step writes (T-10).
- **AuthZ:** staff via Supabase Auth + `app_users.role`; RLS on all tables; guests by hashed token. Service-role key server-only (good). Pre-launch task: run a Supabase RLS review with an anon key against *every* table on the production project, not just the local one.
- **Abuse/fraud:** honeypot + dwell + origin check on `/demand`; rate limits ineffective at scale (T-9). Fraud vectors specific to this product: fake orders to tie up runners (mitigate: card pre-auth or phone verification for cash orders, delivery-code check), card chargebacks ("never got it") — mitigated by delivery code + runner timestamps; runner cash skimming — mitigated by `shift_cash` reconciliation SOP.
- **Performance:** marketing JS 135 KB gz vs 120 KB plan (acknowledged); fine for 4G, test on real beach signal. Order path is a handful of Supabase round trips; the sequential-write pattern adds latency (~10 calls per order).
- **Scalability:** one beach to ~10 zones is within Supabase Pro + Vercel Pro comfortably. First things to break: in-memory limiter, synchronous webhook handler, offer fan-out to all runners (fine < 10), Supabase connection counts if lambdas fan out (use pooler).
- **Infrastructure cost (monthly, verify current plan prices):** Vercel Pro ≈ US$20/seat, Supabase Pro ≈ US$25, Resend ≈ US$0–20, Sentry/uptime ≈ US$0–30, domain ≈ US$15/yr, WhatsApp Business API provider ≈ US$0–50 → **~US$75–130/mo** (modeled at US$130 in doc 03). Vercel Hobby cannot run `*/5` cron and is not licensed for commercial use.

## 7. Minimum technical scope to take the first paying customer

1. Adopt `main-mf4ule` as trunk; upgrade Next (T-3, T-7).
2. Production Supabase + Vercel, migrations + seed + real polygons + stock (T-2, T-6).
3. **Pilot-0 (cash + manual)**: cash-on-delivery works today — enough to start with invited customers once T-2/T-5/T-6 are done and a runner is on shift. This is the fastest path to *real* learning.
4. Card payments (T-1) + expiry/refund sweep (T-4) before any public marketing.
5. Legal pages and a working WhatsApp number (T-5).
6. Monitoring minimum: error alerts and a restore test (T-14, pulled forward from P1 for the *restore test only*).

Everything else in P1 can follow within a month of launch.
