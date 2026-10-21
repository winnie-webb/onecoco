# 09 — 90-Day Execution Roadmap

**Day 1 = Monday 12 Oct 2026; Day 90 = Saturday 9 Jan 2027.** Planning targets, **not** permission to bypass a blocker: every "go-live" row is conditional on its gate. Owners: **OPR** = Operator-founder, **CTO** = technical founder/contractor, **ACC** = accountant, **ATT** = attorney, **RUN** = runner/vendor lead. Cost in US$ (modeled, see doc 03). "∥" = can run in parallel with the previous row.

Critical path: **D-02 beach permission → polygon survey → production verification → Pilot-0 → card + expiry sweep → public launch.** Legal entity, insurance, permits and tech fixes run in parallel to it.

## Days 1–7 (12–18 Oct): Immediate readiness

| ID | Pri | Task | Owner | Depends | Dur | Cost | Impact | Done when |
|---|---|---|---|---|---|---:|---|---|
| R-01 | P0 | Founder decisions D-01…D-06 (trunk branch, beach target, name, price test, payment rail, JMD policy) — doc 10 | Both founders | — | 2 d | 0 | Unblocks everything | Register filled and signed off |
| R-02 | P0 | Written enquiries + meetings: Doctor's Cave club, UDC (Walter Fletcher), NEPA/BCA, Western RHA, St James Municipal Corp | OPR | — | 5 d | 50 | Resolves the #1 blocker | Written answer from ≥1 operator with terms |
| R-03 ∥ | P0 | Engage attorney + accountant; get fee quotes and the COJ name reservation | OPR | R-01 | 3 d | 180 | Entity + advice | Engagement letters; name reserved |
| R-04 ∥ | P0 | Adopt `main-mf4ule` as trunk; port CI; `npm audit fix`/upgrade Next ≥16.3.8 | CTO | R-01 | 1 d | 0 | T-3, T-7 | CI green on trunk |
| R-05 ∥ | P0 | Stand up production Supabase Pro + Vercel Pro; apply 20 migrations; seed; env vars; verify RLS with anon key | CTO | R-04 | 2 d | 50 | T-2 | Prod checklist section 1 ticked |
| R-06 ∥ | P0 | 7-day validation: on-site survey (60 interviews), vendor interviews, 5 concierge talks, 3 coconut quotes | OPR | — | 5 d | 150 | Tests demand/price/supply | Decision rule in doc 06 §7 evaluated |
| R-07 ∥ | P0 | Apply for PayPal business + one local gateway (WiPay or bank) incl. KYC; confirm settlement-to-JMD path | OPR | R-03 (entity) | 3 d to apply | 0 | Card rail | Applications submitted; fees/terms recorded |
| R-08 ∥ | P1 | Insurance: 3 broker quotes | OPR | R-03 | 5 d | 0 | F-1 | Quotes compared |

## Days 8–14 (19–25 Oct): Commercial launch preparation

| ID | Pri | Task | Owner | Depends | Dur | Cost | Impact | Done when |
|---|---|---|---|---|---|---:|---|---|
| R-09 | P0 | Incorporate; TRN; bank account; employer & OIC registrations | OPR+ACC | R-03 | 5–10 d | 280 | Legal capacity | COJ certificate; TRNs; account open |
| R-10 | P0 | Survey real polygon(s) on the beach; time test walks; set `route_factor`, hours, stock | OPR+CTO | R-02 permission in principle | 1.5 d | 0 | T-6 | Pin tests at 6 points correct |
| R-11 ∥ | P0 | Draft & publish Terms, Privacy, Refund policy; WhatsApp Business number; real contact details | ATT+CTO | R-03 | 4 d | 1,500 | T-5 | Pages live, linked in checkout |
| R-12 ∥ | P0 | Recruit and hire 2 runners (prefer existing vendor); food-handler training + medicals | OPR | R-02 | 7 d | 60 | B-3 | 2 valid permits; contracts signed |
| R-13 ∥ | P0 | Supplier agreements (primary + backup), ice, equipment purchase | OPR | R-06 | 5 d | 1,200 | Supply | First delivery received; quality accepted |
| R-14 ∥ | P0 | Build T-4 expiry/refund sweep; fix wrong email; add PostHog events | CTO | R-05 | 3 d | 1,200 | Prevents stranded paid orders | Zero-runner test auto-refunds |
| R-15 ∥ | P0 | Build T-1 card checkout in sandbox (PayPal first; gateway adapter when approved) | CTO | R-07 | 5 d | 1,500 | Card revenue | Sandbox order + refund + webhook processed |
| R-16 ∥ | P1 | Name decision → domain, brand, QR design; photo/video shoot | Both | R-01 | 7 d | 1,200 | Trust, conversion | Assets approved |
| R-17 | P1 | SOP binder v1, roster, backup runners, cash box procedures | OPR | R-12 | 3 d | 50 | Operational safety | Dry run (5 test orders) passes |

## Days 15–30 (26 Oct–10 Nov): Launch and validation (Pilot-0)

| ID | Pri | Task | Owner | Depends | Dur | Cost | Impact | Done when |
|---|---|---|---|---|---|---:|---|---|
| R-18 | **Gate** | **Pilot-0 go/no-go**: permission in writing ✔, entity ✔, food permits ✔, insurance bound ✔, privacy/terms ✔, prod verified ✔, polygon ✔, stock ✔, runner trained ✔ | Both | R-02…R-14 | — | — | Safe start | Launch checklist section A all ticked |
| R-19 | P0 | Open zone (cash, invite-only, ≤ 20 orders/day); founders on beach daily; daily huddle | OPR+RUN | R-18 | 14 d | 800 | First revenue + learning | ≥ 60 orders; metrics captured |
| R-20 ∥ | P0 | Record every order's cost, time, issue; weekly review; fix top 3 operational bugs | Both | R-19 | ongoing | 0 | Unit economics | Weekly one-pager |
| R-21 ∥ | P0 | Finish card integration live test (US$1 real order); webhook registered and processed | CTO | R-15, R-09 | 3 d | 20 | Revenue scale | Live payment captured + refunded |
| R-22 ∥ | P1 | Sign 3 QR partners (boutique hotel/villa); print cards | OPR | R-16 | 7 d | 150 | Demand channel | 3 signed agreements |
| R-23 ∥ | P1 | Runner quality: shadow shifts, tip jar policy decision, review request script | OPR | R-19 | — | 0 | Quality | — |

## Days 31–60 (11 Nov–10 Dec): Optimise and prepare season

| ID | Pri | Task | Owner | Depends | Dur | Cost | Impact | Done when |
|---|---|---|---|---|---|---:|---|---|
| R-24 | **Gate** | Soft public launch: card on, expiry sweep live, ≥ 50 successful orders, on-time ≥ 80% | Both | R-21, R-14 | — | — | Public marketing allowed | Gate met |
| R-25 | P0 | Run content/creator/referral plan (doc 07); price test (2 weeks) | OPR | R-24 | 14 d | 800 | CAC ≤ $3; price | Price decision recorded |
| R-26 ∥ | P1 | P1 tech batch: rate limiter, atomic order/transition RPCs, inventory decrement, monitoring + restore test, customer cancel | CTO | R-24 | 12 d | 2,000 | Robustness | T-9…T-14 closed |
| R-27 ∥ | P1 | Scout expansion zone #2 (second MoBay beach and Ocho Rios): permission, vendor-partner, partners | OPR | R-19 data | 10 d | 100 | Pipeline | Shortlist with operator interest |
| R-28 ∥ | P1 | Weekly PMF dashboard; fix funnel leaks | CTO | R-19 | — | 0 | Learning | Dashboard live |
| R-29 | P1 | Prepare Dec 15 season: stock plan, second runner on call, Sandals/Bahia reopening outreach | OPR | R-24 | 10 d | 300 | Capture demand | Peak-day plan rehearsed |

## Days 61–90 (11 Dec–9 Jan): Season peak and gated expansion

| ID | Pri | Task | Owner | Depends | Dur | Cost | Impact | Done when |
|---|---|---|---|---|---|---:|---|---|
| R-30 | P0 | Season launch (15 Dec): QR in all partner properties; Sandals MoBay (18 Dec if confirmed) outreach | OPR | R-29 | — | 500 | Peak revenue | Orders/day tracked vs 9 gate |
| R-31 | **Gate** | **Zone #2 decision (≈ 15 Jan)**: all doc 08 gates met? If yes, open; if no, extend and fix | Both | R-30 | — | — | Controlled growth | Decision logged |
| R-32 | P1 | If gates pass: open zone #2 (setup US$1.7k, 2 QR partners pre-signed, vendor-partner trained, dry-run) | OPR | R-31 | 14 d | 1,700 | Scale | Zone #2 live |
| R-33 ∥ | P2 | GCT/accounting check against 12-month run-rate; payroll filings on time | ACC | — | monthly | 120/mo | Compliance | Filings made by 14th |
| R-34 ∥ | P2 | Plan Phase B items: per-beach settings, push assignment, SEO pages, SMS/WhatsApp | CTO | R-31 | — | — | Prepare scale | Backlog sized |

### Simultaneity map
Weeks 1–2: R-02, R-03, R-04, R-05, R-06, R-07, R-08 all in parallel. Weeks 2–3: R-09…R-17 in parallel; the **only serial chain** is R-02 → R-10 → R-18. Tech chain R-04 → R-05 → R-14/R-15 → R-21 runs independent of legal until the card go-live (needs the entity).

### Budget roll-up (days 1–90, Base)
Pre-launch ≈ US$9.8k (incl. contingency) + beach #1 US$1.7k + operating loss M1–M3 ≈ US$3.1k ⇒ cumulative **−US$14.6k ≈ J$2.3M** at end of M3 (consistent with doc 03). Add ~US$1.7k + ramp for zone #2 if gates pass.

### What would change the plan
Permission refused → pivot to the next operator/market (R-27 becomes critical). Coconut cost > US$1.30 or supply unreliable → renegotiate or raise price. Orders/day < 7 after 4 weeks in season → stop expansion, fix demand (partners, price, hours) before spending more. Serious incident → pause all zones.
