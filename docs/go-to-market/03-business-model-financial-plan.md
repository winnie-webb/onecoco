# 03 — Business Model & Financial Plan

*All figures in USD with JMD at **J$158 / US$1** (aggregator rate, 26 Sep 2026 — re-check the Bank of Jamaica rate when using). The live model is `financial-model.xlsx` (formulas, editable blue inputs; recalculated and error-free). **Everything below labelled "modeled" is an assumption-driven estimate, not a verified fact.** Verified inputs are marked ✔ with source in doc 06 / 04.*

## 1. What the business is (from the code, not assumed)

OneCoco is a **single-entity, owner-operated, direct-to-consumer delivery service**: fresh coconuts opened at a beach cart and walked by staff runners to a tourist's spot on the sand, ordered from a phone. Architecture decision #1: "One Coco operates it. Runners are staff; One Coco sources the coconuts. No vendor entity, no payouts engine." So:

- **Revenue = GMV.** There is no marketplace take-rate; every dollar charged is OneCoco's revenue (before any GCT). Partner commission (hotels/QR) is a *cost* of sale, `partners.commission_rate_bps`.
- **Who pays / when:** the customer, at order (card) or on delivery (cash), in **USD**. PayPal receives in Jamaica but withdrawal to a local bank is disputed in sources I found (one 2026 guide says bank withdrawal works; a 2025 Jamaican blog says it does not and recommends routing via Wise) → must be verified with PayPal/your bank *before* committing (D-05).
- **Differentiation claimed in the product:** speed (6–12 min ETA range), personalisation, trackable delivery with proof code, partner QR at hotels. None validated with customers yet.

## 2. Payment rail — a strategic issue the code did not resolve

| Option | For | Against | Status |
|---|---|---|---|
| PayPal Orders v2 (built) | Already coded, cards + PayPal wallet, USD-native for tourists | Fees ~4–6% + fixed (unverified), disputes favour buyers, local withdrawal unclear, redirect flow on weak signal | Server code exists, never run live; **UI not wired (T-1)** |
| WiPay (Caribbean gateway) | Lists JMD/USD/TTD; used by Jamaican merchants per integration vendors | I could not verify fees, settlement currency/terms, onboarding time or whether Apple/Google Pay are offered | Contact sales; compare in week 1 |
| NCB PayGate / other bank gateways | Local settlement, JMD | Onboarding time, fees unknown | Ask your bank |
| Stripe | Apple/Google Pay one-tap — best beach UX | Not available to Jamaica-based businesses (per Phase 0 notes); needs foreign entity (e.g., US LLC) | Phase 2 option |
| Cash (USD/JMD) | Zero fee, works today | Shrinkage, runner safety, reconciliation workload, no pre-commitment (no-shows) | Pilot-0 default |

**Recommendation:** Pilot-0 on cash; in parallel apply to **two** processors (PayPal business + one local gateway) and wire whichever approves first behind the existing `PaymentProvider` interface. Do not form a US entity for Stripe until monthly card volume exceeds roughly US$10k/month.

## 3. Recommended pricing

Current seed: Classic **US$7**, Coco for Two **US$12**, delivery **US$2**, name +$2, lime +$1, extra water +$2. (`lib/marketing-menu.ts` also shows "from US$9".)

Evidence on competing price is thin: I found **no reliable price for a beach coconut at Doctor's Cave**; one low-quality page claims US$2–3 on Caribbean beaches (unverified). Informal vendors almost certainly sell cheaper than US$7 → OneCoco is selling *convenience and trust*, not a cheaper nut. This is the single biggest unvalidated commercial assumption.

Recommendation:
1. **Launch price: Classic US$7 + US$2 delivery (US$9 delivered; J$1,422)**; Coco for Two US$12 with **free delivery** (raises basket, improves runner utilisation). Show an all-in total up front — no surprise fees.
2. **Run a 2-week price test** (A/B by QR code/day): US$7+2 vs US$6+2 vs US$8 all-in. Target the highest price with ≥12% scan-to-order conversion.
3. **First-order offer**: "Your first delivery free with code BEACH1" — funded from marketing, cost ≈ US$2 per new customer (inside modeled promo discount).
4. **Do not discount below** Classic US$6 + US$1.50 delivery: below that, contribution after runner pay falls under ~US$3.5/order.
5. **GCT:** set to 0 until an accountant confirms (a) whether fresh coconut water/coconut is zero-rated/exempt, and (b) when registration is required. Registration threshold reported at J$15M annual taxable supplies (≈ US$95k) — secondary sources only, verify at TAJ. Base case revenue (US$92k) sits right at that line in year 1, so plan to register by month ~10.

## 4. Unit economics (Base scenario; sheet `BreakEven`)

| Per order | US$ | J$ | Basis |
|---|---:|---:|---|
| Revenue: product US$8.00 avg basket × (1−6% promo) + US$2 delivery | **9.52** | 1,504 | Basket mix: 70% Classic / 15% Two / extras — *assumed* |
| Coconuts (1.2 × US$0.85) | (1.02) | | **Unvalidated** — supplier price needed |
| Supplies (straw, napkin, ice, cup) | (0.25) | | assumed |
| Payment fees (60% card × [6% + US$0.49]) | (0.64) | | rate assumed ≈ PayPal cross-border; verify |
| Cash shrinkage (40% cash × 1.5%) | (0.06) | | assumed |
| Support / refunds / losses (3%) | (0.29) | | assumed |
| Per-delivery runner pay | (1.00) | | assumed J$160 |
| **Contribution before guaranteed shift pay** | **6.27 (65.9%)** | 991 | |
| Guaranteed shift pay US$36/day ÷ orders per beach-day | 4.50 @8/day · 2.25 @16/day · 1.80 @20/day | | min wage J$17,000/40h = J$425/h (✔ from 1 Jul 2026); US$36 ≈ J$5,700 loaded |
| **Contribution after runner pay** | **1.77 @8/day · 4.02 @16/day · 4.47 @20/day** | | |

**GMV vs revenue:** identical here (no pass-through) — a deliberate simplicity. If group-order invoicing or partner payouts are added later, track them separately.

**CAC / LTV (modeled):** a tourist stays ~5–7 days → assume 1.3 orders each; LTV ≈ 1.3 × US$4.02 ≈ **US$5.2 contribution**. Therefore **blended CAC must stay ≤ US$3**. Paid social at tourist-CPMs will not achieve this; the plan must be partner/QR/organic-heavy (doc 07). Locals/expats/villa-rental guests who repeat weekly have far better LTV and are worth a separate test.

### Break-even (Base parameters)

| Metric | Orders/day per beach |
|---|---:|
| Cover one runner's guaranteed pay + phone + coordinator share | **7.0** |
| One beach carrying *all* central costs (tech, insurance, accounting, marketing US$800) + amortised setup | **13.7** (≈ 411 orders / month) |
| Each of 4 beaches sharing central costs | **9.3** |

Interpretation: **a staffed beach loses money below ~7 orders/day regardless of overhead.** That is the operating gate for expansion (doc 08): do not open beach N+1 until beach N is sustaining ≥ 9–10 orders/day on a trailing 14-day basis in its *current season*.

Sensitivities that move the answer most (change the blue cells): orders/day per beach (dominant), runner shift pay, card fee %, coconut cost. A 25% drop in orders/day pushes the single-beach break-even out of reach; a 25% coconut-cost rise costs only ~US$0.25/order.

## 5. Startup budget (one-time, pre-launch)

Mandatory vs optional. All items are *estimates or placeholders* unless flagged; fee sources are third-party summaries (COJ official schedule not retrieved).

| Item | US$ | J$ | Class | Note |
|---|---:|---:|---|---|
| Incorporation + name search/reservation (≈ J$24.5k + J$0.5k stamp + J$3.5k) | 180 | 28,000 | Mandatory | Verify at orcjamaica.com |
| Accountant setup (TRN, payroll registrations, books) | 300 | 47,400 | Mandatory | Quote |
| Attorney: T&Cs, privacy, refunds, staff & partner contracts, beach-access review | 1,500 | 237,000 | Mandatory | Quote |
| OIC data-controller registration | 100 | 15,800 | Mandatory | Fee unverified |
| Insurance (public + product liability) — first premium | 700 | 110,600 | Mandatory | Quote |
| Food-handler permits & medicals ×5 | 60 | 9,500 | Mandatory | 2011-era fee ~J$500 each |
| Beach access / vending permissions & fees | 500 | 79,000 | Mandatory | **Unknown — may be materially higher** |
| Tech hardening (T-1…T-6, T-14) ~100 h contractor | 3,500 | 553,000 | Mandatory | Largest controllable item |
| Trademark + domain | 400 | 63,200 | Recommended | After naming |
| Photography/video + signage design | 800 | 126,400 | Recommended | |
| Pre-launch marketing | 500 | 79,000 | Optional | |
| **Subtotal** | **8,540** | 1,349,000 | | |
| Contingency 15% | 1,281 | | | |
| **Pre-launch total** | **9,821** | **1,551,000** | | |
| First beach setup (cart/cooler 600, tools 200, uniforms/signage 150, runner phone 180, opening stock 200, cash float 150, training 100, QR collateral 120) | 1,700 | 268,600 | Mandatory | per beach thereafter |
| **Launch capital (pre-launch + beach #1)** | **11,521** | **1,820,000** | | |

**Absolute minimum to launch safely** (drop trademark, content, pre-launch marketing; keep legal, insurance, permits, tech, contingency): (6,840 × 1.15) + 1,700 = **US$9,566 ≈ J$1.51M**, plus ~3 months of operating loss (~US$3.1k Base) → **~US$12.6k ≈ J$2.0M**. Below this you are choosing to skip insurance, legal, or the payment fixes — not recommended.

Excluded and why: vehicles (runners walk), a commissary/kitchen (cart-based), founder salaries (assumed US$0 — see D-09), paid staff beyond runners/coordinator, GCT liability (below threshold), corporate tax (loss-making year 1).

## 6. Forecast: three scenarios (12 months, launch = Dec 2026 = M1)

Common assumptions: seasonality (modeled, **no verified Jamaica series**): Dec 1.0, Jan–Mar 1.1, Apr 0.9, May 0.7, Jun 0.6, Jul–Aug 0.7, Sep–Oct 0.5, Nov 0.7. Beach count follows the expansion gates; a new beach ramps linearly to maturity. Runner positions scale with orders (20 orders/runner-shift). One ops coordinator per 3 beaches from M2.

| Scenario | Mature orders/day/beach | Ramp | Coconut cost | Marketing/mo | Beaches (M12) |
|---|---:|---:|---:|---:|---:|
| Conservative | 9 | 5 mo | US$1.20 | $500 | 2 |
| Base | 16 | 4 mo | US$0.85 | $800 | 6 |
| Aggressive | 24 | 3 mo | US$0.70 | $1,500 | 14 |

| 12-month result | Conservative | **Base** | Aggressive (upside only) |
|---|---:|---:|---:|
| Orders | 2,511 | **9,708** | 38,568 |
| Revenue US$ (J$) | 22,579 (3.57M) | **92,420 (14.6M)** | 384,909 (60.8M) |
| Contribution after labour | (7,391) | **18,755** | 160,489 |
| Operating profit/(loss) | (24,686) | **(6,590)** | 114,994 |
| Month-12 run-rate op. profit | (1,952)/mo | **+2,548/mo** | +25,686/mo |
| First month op-profit > 0 | none in 12 mo | **Mar-27** (dips with each expansion wave) | Jan-27 |
| **Peak cumulative funding need** | **US$37,907 (J$5.99M)** | **US$29,159 (J$4.61M)** | US$13,708 (J$2.17M) |
| Cumulative cash after 90 days (M3) | (17,108) = J$2.70M | **(14,575) = J$2.30M** | (11,929) = J$1.88M |

Base first-90-day detail (US$): revenue 1,142 / 2,513 / 3,770; operating loss (1,463) / (1,210) / (382); plus pre-launch 9,821 and beach-setup 1,700 → cumulative −14,575 by end of M3.

How to read it:
- **Plan the business on Base, fund it to the Conservative peak (≈ J$6M)**, and treat Aggressive as upside — it assumes 24 orders/day on every beach and 14 zones, which nothing in evidence supports yet.
- Base is only marginally profitable by M12 **because expansion is front-loaded into a low season**; if expansion is paused until the Dec–Mar high season has proven the per-beach rate, the model's M12 profit is higher and peak funding lower. The gates in doc 08 enforce this.
- Unit economics work *per order*; the business fails by **fixed staffing per beach × too few orders**, not by margin.

### Spreadsheet formulas (the model is built this way — copy/extend)
- Orders/day = `effective_beaches × mature_opd × season`, where `effective_beaches = SUMPRODUCT(new_beaches_k × MIN(1,(m−k+1)/ramp))` (written with the `(x+R−ABS(x−R))/(2R)` identity so it works in Excel and LibreOffice).
- Revenue = `orders × (basket×(1−promo) + delivery_fee)`.
- Payment fees = `card_share × (fee% × revenue + fixed × orders)`.
- Runner labour = `beaches × MAX(1,ROUNDUP(opd_per_beach/20,0)) × shift_pay × 30 + orders × per_delivery_pay`.
- Operating profit = revenue − variable − labour − (tech+accounting+insurance+phones+coordinators+marketing).
- Net cash = operating profit − pre-launch (M0) − beach setup; peak funding = `−MIN(cumulative cash)`.

## 7. Working capital & conditions before expansion

- Float: US$150 cash per beach (included). Card proceeds settle days later (gateway-dependent) → hold ≥ 3 weeks of payroll in reserve.
- Runner payroll is paid weekly/fortnightly while card settlement lags; statutory remittances are due by the 14th of the following month (secondary sources; confirm with TAJ).
- **Financial gates before each new beach:** (1) trailing-14-day orders/day on the existing beach ≥ 9 in its season; (2) contribution after labour ≥ US$3/order; (3) cash on hand ≥ 12 weeks of *total* fixed costs + setup of the new beach (≈ US$1.7k + US$3k); (4) refund+chargeback rate < 3% of orders; (5) on-time rate ≥ 85%.

## 8. Capital for islandwide coverage (indicative, modeled)

~20 beach-zones across ~10 coastal parishes: setup 20 × US$1.7k = 34k; ramp losses ~US$1.0k × 20 = 20k; central team (ops manager, marketer, part-time developer) ≈ US$3k/mo × 6 = 18k; subtotal 72k + 20% contingency ≈ **US$86k ≈ J$13.6M** (range J$12–16M). Excludes hurricane-recovery risk and any beach-access fees. This is a funding *ceiling*, to be released by gates — not required up-front.

## 9. Funding plan suggestion

Launch with **J$2.0M minimum / J$6.0M recommended** from founders + friends-and-family or a small angel/grant. Look at JBDC / DBJ / Jamaica Business Fund-type micro-grants and tourism-recovery programmes post-Melissa (not researched in depth — D-12). Avoid debt until gates are met: this business has seasonal revenue.
