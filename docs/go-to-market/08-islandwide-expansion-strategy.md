# 08 — Islandwide Expansion Strategy

## 1. Verdict on "all 14 parishes in 60–90 days"

**Not realistic, and for most parishes not meaningful for this product.**
1. The product is **beach-chair delivery to tourists**. Manchester has no coastline; St Andrew is essentially inland (its "beach" is a tiny harbour edge); several other parishes have beaches with few visitors. A coconut-to-your-chair service has no customer in a landlocked parish — "coverage" there would be a different business (generic delivery).
2. Each beach needs: operator permission (unknown, slow), surveyed polygon, runner(s), stock supply, partners. Permissions alone are weeks per site.
3. The tourism market is **−17% y/y** with ~9,000 rooms closed until early 2027 (doc 06). Expanding during recovery spreads thin demand over more fixed cost: the model shows a staffed beach loses money below ~7 orders/day.
4. The business hasn't yet shown *one* beach works. Expansion before product–market fit multiplies losses.

**Fastest credible alternative:** by day 90 (≈ 8 Jan 2027) have **1 profitable-trending beach in St James and 2–3 additional beach-zones in 2 more parishes (target: St Ann/Trelawny and Westmoreland), each opened only after passing the gates**. Reframe "islandwide" as "**every parish with a viable tourist beach, 9–18 months**", with an *asset-light* model (below). Landlocked and low-tourism parishes are reached, if ever, by a different product (groups/events by partner portal, not a runner on the sand).

## 2. Asset-light expansion model

- **Per-zone cell, same SOP.** The code already treats a new beach as seed data (`INSERT` beach + prep point + zone + inventory; Phase 11 proved dispatch scoping across two beaches). The expensive parts are people and permission, not software.
- **"Franchise-lite" runner-partners:** recruit an *existing licensed coconut vendor* at the target beach as the zone's runner/cart-owner on an employee-or-licensed-partner basis (⚖️ decide structure); OneCoco supplies tech, brand, QR demand, stock standards and payment; vendor keeps their regular walk-up sales. This removes the incumbent-vendor conflict and capex (cart already exists).
- **Remote operations:** admin console + WhatsApp group per zone; central coordinator covers 3 zones (US$650/mo modeled).
- **Regional hubs** are *not* needed until ≥ 8 zones; before that the coordinator travels.
- **Partner-led demand:** each new zone must open with ≥ 2 hotel/villa QR partners signed *before* the cart.
- **Weekly gating review:** (Monday) metrics for each zone vs gates; decisions logged in the roadmap doc.

## 3. Phases

| Phase | Coverage | Demand (modeled, per beach at maturity) | Operations & staff | Tech | Capital (incremental) | Success criteria / gate to next |
|---|---|---|---|---|---|---|
| **A — Initial launch** (Oct–Dec 2026) | 1 zone, MoBay Hip Strip (Doctor's Cave or Walter Fletcher, whichever grants permission) | 4→16 orders/day (ramp 4 months; Dec–Mar high season) | Operator + 2 runners; contractor dev | P0 fixes (doc 02) | Pre-launch US$9.8k + beach setup US$1.7k | PMF table (doc 07 §6) passes 2 consecutive weeks |
| **B — Regional** (≈ Jan–Jun 2027) | +2–5 zones: second MoBay beach, **Ocho Rios (St Ann)**, **Falmouth (Trelawny)**, **Negril (Westmoreland)** if recovered | 9–16 /day each | + 1 coordinator per 3 zones; vendor-partner runners | P1 items; per-beach settings; limiter; monitoring | ≈ US$1.7k setup + ~US$1k ramp loss per zone + coordinator US$650/mo | Each zone passes gates 4 weeks after opening; central costs covered by ≥ 3 zones |
| **C — Island coverage of viable beaches** (≈ Jul 2027–2028) | Remaining coastal tourist parishes: Hanover, Portland, St Mary, St Elizabeth (Treasure Beach), Clarendon, St Thomas, Kingston/St Catherine (Port Royal, Hellshire — locals product) | Smaller; some seasonal/events only | Regional hub (Kingston + north coast), part-time marketing | Multi-instance infra, push assignment, SEO city pages, WhatsApp ordering | Indicative ≈ US$86k (J$13.6M) for ~20 zones in total (doc 03 §8) | Each parish enters only when ≥ 2 partners signed + beach permission + vendor-partner identified |

## 4. Parish-by-parish rollout matrix

*Beach-viability and phase are my hypotheses from general knowledge plus the Melissa evidence; none are verified demand. "Hurricane" = unconfirmed relative impact.*

| # | Parish | Beach-tourism viability | Candidate sites | Phase | Approach | Notes / risks |
|---|---|---|---|---|---|---|
| 1 | **St James** | Very high | Doctor's Cave, Walter Fletcher, Hip Strip hotels, cruise port | **A** | Direct (founders) | Worst-hit large market; private club beach; Sangster −24% Aug |
| 2 | **St Ann** | High | Ocho Rios, Turtle Beach/Mallards, Dunn's River area | **B (first expansion)** | Vendor-partner + QR in villas; cruise-day focus | Dunn's River operator rules; confirm cruise schedule |
| 3 | **Trelawny** | Medium | Falmouth cruise port, Silver Sands, Rio Bueno | **B** | Group/partner-led (tour operators) | Cruise-day lumpy |
| 4 | **Westmoreland** | Very high *when recovered* | Negril 7-Mile Beach, Long Bay | **B (after on-site check)** | Vendor-partners; dense incumbents | Heavy hurricane impact (unverified) — do not open until hotels reopen |
| 5 | **Hanover** | Medium | Lucea, Round Hill/Orchard Beach resorts | C | Resort-adjacent QR | Mostly all-inclusive/villa |
| 6 | **Portland** | Low–medium, boutique | Boston Bay, San San, Frenchman's Cove | C | Villa-hosts partners, events | Low density; weather |
| 7 | **St Mary** | Low–medium | Oracabessa, Boscobel | C | Villa-hosts | Low density |
| 8 | **St Elizabeth** | Low–medium | Treasure Beach, Black River | C (late) | Vendor-partner | Severe hurricane damage reported generally (unverified) |
| 9 | **Clarendon** | Low | Rocky Point, Portland Cottage | C (late/optional) | Local-events only | Few tourists |
| 10 | **St Catherine** | Locals-medium | Hellshire Beach, Portmore | C (locals test) | Weekend local product test | Different segment & price |
| 11 | **Kingston** | Low (tourists) | Port Royal/Palisadoes day-trips, Lime Cay | C (events) | Group orders | Event-driven |
| 12 | **St Thomas** | Very low | Morant Bay, Bath | Defer | — | Few tourists |
| 13 | **St Andrew** | None (inland) | — | **N/A** for beach product | Group orders via partner portal if corporate/event demand | Inland delivery is a different business |
| 14 | **Manchester** | None (landlocked) | — | **N/A** | — | — |

## 5. Expansion gates (all must be true, in the zone's current season, trailing 14 days)

| Gate | Threshold |
|---|---|
| Volume | Existing zone ≥ 9 orders/day (non-event) |
| Unit economics | Contribution after labour ≥ US$3/order; cumulative zone cash flow ≥ 0 |
| Reliability | On-time ≥ 85%; order→delivered ≥ 95%; accept time ≤ 3 min median; zero expired-unrefunded orders |
| Customer | Rating ≥ 4.6; refund+chargeback ≤ 3% |
| Cash | ≥ 12 weeks of total fixed costs + new zone setup (≈ US$1.7k) in the bank |
| Operations | Spare trained runner for existing zone; supplier delivering ≥ 95% on time; cash variance < US$2/shift |
| Compliance | Permission in writing; food-handler cards; insurance covers the site; polygon surveyed |
| Pre-opening | ≥ 2 QR partners signed; vendor-partner/runner hired and trained; test day passed (5 dry-run orders) |
| People | Coordinator capacity: ≤ 3 zones per coordinator |

**Never open a zone because the calendar says so.** If a gate fails, fix the cause or hold.

## 6. 90-day expansion outcome (Base) vs stretch
Base model beach count: 1 (Dec) → 2 (Mar) → 4 (Jun) → 6 (Sep–Nov). A faster stretch (2 zones by day 60, 3–4 by day 90) is possible **only** if beach #1 hits ≥ 12/day in December and cash ≥ US$8k. Treat that as a decision on ~15 Jan 2027.
