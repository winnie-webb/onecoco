# 07 — Go-to-Market Plan

## 1. Minimum viable commercial launch

**Smallest thing that delivers value and earns revenue:** one beach zone, one cart, one runner on shift, Classic + Coco for Two (no customiser), cash **and** card, tracking page, WhatsApp support, 5 hours of daily service in the proven peak, and 3–5 hotel/villa QR placements.

| Element | Minimum | Can be manual in pilot |
|---|---|---|
| Product | Quote → order → deliver → code → cash/card, tracking, admin pause | Stock counts, refunds, partner payouts |
| Team | Operator + CTO + 2 runners (+ backup) | Support via WhatsApp Business app |
| Geography | 1 zone (the agreed section of 1 beach) | — |
| Partners | 3 QR placements + 1 beach-operator agreement + 1 coconut supplier + backup | Commission paid monthly by transfer |
| Payments | Cash (Pilot-0) → card via PayPal/local gateway before public marketing | USD cash only at first |
| Legal | Company, permits, food handler cards, insurance, privacy/terms | — |
| Marketing | Instagram + TikTok account, 20 short videos, QR cards, WhatsApp link, Google Business Profile | Influencer gifting |

## 2. Launch staging (dates are targets conditional on permission — D-02)

| Stage | Window | What | Gate to enter |
|---|---|---|---|
| **Pilot-0 (invite-only, cash)** | from ~Nov 2–9, 2026 | ≤ 20 invited customers/day; founders on beach; zone hours short; observe | Permission in writing, permits, insurance bound, privacy/terms live, production verified (T-2), runner trained |
| **Soft public launch (card on)** | ~Nov 23–Dec 7 | QR in 3 hotels, Instagram live, free-delivery code | T-1 card live, T-4 expiry/refund sweep live, 50 successful orders, on-time ≥ 80%, no unresolved safety incident |
| **Season launch** | Dec 15 | Winter-season push; Sandals MoBay reopening Dec 18 (if confirmed) | Beach #1 ≥ 9 orders/day trailing 14 d |

*Launching "today" is impossible: no zone is `OPEN`, polygons are placeholders, card payment is unwired, legal entity and permits don't exist. Fastest realistic **first paying customer: ~Nov 9, 2026 (cash, invite-only)**; **first card-paying public customer ~Dec 1** — but only if the beach operator says yes in the next two weeks.*

## 3. Market selection (initial launch)

Scoring 1–5 (5 best). **All scores are my judgement from limited evidence — validate on-site (doc 06 §7).**

| Market | Demand density | Post-Melissa condition | Competition/informal | Logistics/ease | Permission difficulty | Total |
|---|---:|---:|---:|---:|---:|---:|
| **Montego Bay Hip Strip (St James)** | 5 | 2 (rooms closed, MBJ −24%) | 3 | 5 (seeded, close to founders) | 3 (club + UDC) | **18** |
| Ocho Rios (St Ann) | 4 | 3? | 3 | 3 | 3 | 16 |
| Negril 7-Mile (Westmoreland) | 5 | 1? (heavily affected) | 2 (dense vendors) | 2 | 3 | 13 |
| Falmouth (Trelawny) | 3 | 3? | 4 | 3 | 3 | 16 |
| Kingston/Port Royal/Hellshire (K'ston, St Catherine) | 2 (tourists) / 4 (locals) | 4 | 3 | 4 | 3 | 16 |
| Portland / St Mary / St Elizabeth | 2 | 2–3 | 4 | 1 | 3 | 12 |

Recommendation: **Montego Bay first** (already built for it; reopening wave Dec 1–18), **but scout Ocho Rios in November** as the fallback/second market. If neither beach operator agrees in 3 weeks, switch to whichever operator says yes first — location without permission is worthless. Do not assume Kingston: its beach-going tourist base is thin; its opportunity is locals/events (a different product test).

## 4. Customer acquisition plan (Dec–Jan, Base scenario, per beach)

Channel budgets are *modeled* (US$800/mo central marketing + US$400 launch activation per beach) and expected results are *targets*, not forecasts.

| Channel | How | Budget/mo | Target outcome | CAC |
|---|---|---:|---|---:|
| **Hotel/villa/Airbnb QR + concierge** (best channel) | Table-tent and welcome-pack QR cards; staff commission (`commission_rate_bps`, e.g., 10%); concierge briefed; 1 free-nut card for staff | $150 (cards, tents, gifts) + commission ≈ $0.90/order | 30–40% of orders | ≈ $0.90–$1.50 |
| **Beach-entrance cart + visible runner** | Cart sign with QR, runner in branded tee walks the strand, "Order from your chair" | $0 incremental | 25% | ≈ $0 |
| **WhatsApp** | Order link in Google Business Profile, Instagram bio, QR; auto-reply w/ menu; broadcast list of past customers (opt-in) | $20 | 10% + repeat | ≈ $0 |
| **Instagram/TikTok organic** | 3 reels/wk (nut-opening ASMR, "chair delivery" reveals, customer reactions) | $100 (gear, boosts) | brand lift; 10% | ≈ $2 |
| **Micro-influencers/travel creators** | 6 gifted visits/mo (Jamaican & Black-travel creators, couples travel) | $150 | 10% | ≈ $2–4 |
| **Referral** | "Give $2 off, get $2 off" code | funded by promo line | 10% | ≈ $2 |
| **Google/Meta ads** | Geo-fenced to hotel areas, only after conversion ≥ 12% | $300 test | experiment | likely > $5 (above LTV) — cap |
| **Tour operators/cruise excursions** | Group-order portal (built) | $0 | few large baskets | — |

Rule: **blended CAC ≤ US$3.** If paid channels exceed it, cut them.

## 5. First 100 paying customers (target: 4 weeks from soft launch)

1. **Week 0 (pre-launch):** 10 friends/family test orders (price US$5) to find bugs; film everything; collect testimonials; set up Google Business Profile + 5 photos.
2. **Week 1 – "Hip Strip Hello":** runner + founder at the beach 10:00–16:00; hand out QR cards to everyone within 30 m of the cart; "first delivery free" (code BEACH1); goal 25 customers. Ask each for WhatsApp number and a 1-question rating.
3. **Week 2 – Hotels:** 3–5 hotels/villas place QR cards; concierge offers a free nut to staff; goal 30 more.
4. **Week 3 – Creators + referral:** 4 creator visits; referral code on receipt email/WhatsApp; goal 30 more.
5. **Week 4 – Group orders & events:** 2 group orders (birthday, wedding party, tour group) via Partner portal; goal 15 more.
6. **Daily:** 5-minute huddle; read every rating; call 5 customers per week.

*Conversion steps:* QR scan → menu with price (no location gate) → location → pay. Instrument each step (PostHog) — target scan→order ≥ 12%, order→delivered ≥ 95%.

*Retention for tourists:* second-order within stay (WhatsApp "Another one at 3 pm?" 90 min after delivery); QR card with next-trip code; review request after delivery. Retention for locals: weekend bundle (3 nuts), loyalty stamp.

## 6. Product–market-fit evidence (all must hold for 2 consecutive weeks to trigger expansion)

| Metric | Threshold |
|---|---|
| Orders/day on beach #1 (non-event days, in season) | ≥ 9 |
| Order→delivered success | ≥ 95% |
| On-time (≤ promised ETA max) | ≥ 85% |
| Customer rating (post-delivery) | ≥ 4.6 / 5; ≥ 30% response |
| Repeat within 7 days | ≥ 20% of customers (tourists) |
| Scan→order conversion (QR) | ≥ 12% |
| Contribution after labour | ≥ US$3 / order |
| Refund + chargeback | ≤ 3% of orders |
| Unprompted referrals/organic share | ≥ 15% |
| Beach operator and existing vendors | no formal complaints |

## 7. Pricing/promo calendar
Week 1–2: BEACH1 free delivery; Week 3: price test (US$7+2 vs US$6+2); Week 4: Coco-for-Two free delivery default. Valentine's, Easter, Reggae Sumfest (July, Montego Bay) and university spring-break are natural peaks to plan for (verify dates).

## 8. Brand/communications must-haves before marketing
Final name + domain (D-03), photography of real nuts/beach/runner, WhatsApp number, 20-second explainer video, FAQ (what if you can't find me? safety? how is it opened?), review/TripAdvisor/Google presence, a named human ("Meet Marlon, your runner").
