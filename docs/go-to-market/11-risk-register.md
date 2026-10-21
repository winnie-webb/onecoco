# 11 — Risk Register

Likelihood (L) and Impact (I): 1 low – 5 high. Score = L×I. Owners per doc 09.

| # | Risk | L | I | Score | Early-warning indicators | Mitigation | Owner |
|---|---|:-:|:-:|:-:|---|---|---|
| 1 | **No beach/operator permission** (private club, UDC, vendors object) | 4 | 5 | 20 | No written reply in 10 days; operator asks for exclusivity or large fee | Start with the operator who says yes; hire incumbent vendors as runners; scout 2nd market in parallel; keep pilot within permitted zone | OPR |
| 2 | **Demand too thin** (price vs informal vendors; post-hurricane tourist drop) | 4 | 5 | 20 | <7 orders/day after 4 weeks in season; survey <35% yes; high scan-no-order | Validation before capex; price test; partner channels; stop expansion; lower fixed (guaranteed pay) | Both |
| 3 | **Cash runs out** (staffing fixed, orders low; card settlement lag) | 3 | 5 | 15 | Cash < 8 weeks of fixed costs; negative contribution/order | Fund to J$6M; gates; guaranteed-pay minimal; pause beach | Both |
| 4 | **Card payments not live/blocked** (PayPal/gateway KYC, frozen funds, withdrawal route) | 3 | 4 | 12 | Application pending >3 wks; reserve held; chargebacks | Two applicants; cash pilot; clear refund policy; evidence pack | OPR/CTO |
| 5 | **Paid order stranded / no refund** (T-4) | 3 | 4 | 12 | Orders in AWAITING_RUNNER >8 min | Build sweep before card; ops alert; WhatsApp | CTO |
| 6 | **Last-20-metres failures** (can't find customer) | 4 | 3 | 12 | `UNDELIVERABLE` >5%; late rate >15% | Landmark/description prompts, delivery code, call/WhatsApp, photos, runner training | RUN |
| 7 | **Runner reliability / cash theft** | 3 | 3 | 9 | Cash variance >US$2/shift; no-shows | Two-person count, caps, on-call backup, delivery code + timestamps, hire known vendors | OPR |
| 8 | **Coconut supply/price shock** (hurricane-damaged sector, lethal yellowing) | 3 | 4 | 12 | Supplier misses 2 deliveries; price >US$1.30 | Two suppliers, 1-day buffer, price pass-through, stock auto-pause | OPR |
| 9 | **Food safety incident / injury** | 2 | 5 | 10 | Complaint of illness; cut injury | Permits, hygiene SOP, cold chain, gloves, insurance, incident SOP | OPR |
| 10 | **Regulatory non-compliance** (health, DPA, labour, vending) | 3 | 4 | 12 | Inspection notice; unanswered regulator email | Attorney/accountant, checklist, no launch before B-1…B-3 | OPR/ATT |
| 11 | **Data breach / privacy complaint** (location+phone) | 2 | 4 | 8 | Audit findings, anon RLS test fails | RLS review, retention job, MFA, Sentry, DPA registration, minimal data | CTO |
| 12 | **Dependency vulnerability exploited** | 2 | 3 | 6 | `npm audit` high+ | Upgrade Next, audit in CI | CTO |
| 13 | **Technical failure at peak** (outage, rate limiting ineffective, non-atomic writes) | 3 | 3 | 9 | 5xx rate, duplicate/orphan orders | Monitoring, atomic RPCs, load test, runbook, paper backup | CTO |
| 14 | **Competition / copying** (hotels or vendors add delivery; delivery apps add beach) | 2 | 3 | 6 | Rival QR cards at same hotels | Partner exclusivity, speed/brand, local relationships | OPR |
| 15 | **Expansion too fast** | 3 | 4 | 12 | Zone #2 opened with gate failing | Gates in doc 08; weekly review | Both |
| 16 | **Founder capacity** (two people running legal, tech, beach) | 4 | 3 | 12 | Missed deadlines, sleepless founders | Contractor for tech, vendor-partner runners, coordinator at zone #3, drop customiser | Both |
| 17 | **Hurricane season / weather** (Jun–Nov) | 4 | 3 | 12 | NHC advisories; empty beach | Pause tool, flexible runner pay, seasonality in cash plan, insurance review | OPR |
| 18 | **Brand/domain conflict** | 3 | 2 | 6 | Trademark conflict, domain price | Decide early (D-03) | Both |
| 19 | **FX / pricing mismatch** (USD prices vs JMD costs) | 3 | 2 | 6 | JMD depreciation >5% | Quarterly price review; JMD cash policy | Both |
| 20 | **Reputation incident** (tourist complaint viral; harassment allegation) | 2 | 4 | 8 | Negative review/TikTok | Code of conduct, training, quick response, insurance | OPR |

## Three biggest reasons OneCoco could fail (despite working software)
1. **Permission and incumbents** — no right to operate on the beach, or vendors/operator push back (risk 1).
2. **Insufficient demand at a US$9 delivered price** in a recovering tourism market, leaving fixed staffing underused (risks 2–3).
3. **Operational unreliability** — coconuts not fresh/available, runners not finding customers, stranded paid orders — destroying the "10 minutes" promise before reviews build (risks 5, 6, 8).
