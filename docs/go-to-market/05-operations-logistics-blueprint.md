# 05 — Operations & Logistics Blueprint

OneCoco is a **delivery operation with a website**, not software with some logistics. This blueprint matches what the code already assumes (staff runners, a prep point per beach, cash float per shift, zone pause control, accept window) and keeps fixed cost near zero until orders justify it. Numbers are modeled (doc 03).

## 1. Operating model: decentralised cells, centralised brain

- **Cell = one beach zone** = 1 cart (prep point) + 1 runner on shift (2nd runner when sustained > 20 orders/day).
- **Centre** = the founders' phones + the admin console: pause zones, watch `at_risk`, refund, restock, reconcile cash.
- **In-house vs outsourced:** *in-house* — preparation and delivery (it is the brand experience and the code assumes staff); *outsourced* — payroll/accounting, legal, SMS/WhatsApp provider, hosting, coconut supply (buy delivered, graded, on a standing order). Do **not** build a central commissary, vehicles, or a call centre.
- **Hours:** zone hours default 09:00–17:00 daily (seed). Start with the hours the beach operator allows and the hours the data shows demand (e.g., 10:30–16:00); fewer hours = less idle guaranteed pay.

## 2. Day-to-day roles (lean)

| Role | Who at launch | Does | Hire trigger |
|---|---|---|---|
| Founder-CEO ("Operator") | Founder | Beach operator/partner relationships, permits, supplier, cash reconciliation, escalations; on beach 2–3 days/wk first month | — |
| Founder-CTO / contractor | Founder or contractor | P0 fixes, deploys, monitoring, fix bugs same day | Contractor 10–15 h/wk after launch |
| Runner/vendor (employee) | 2 people per beach (cover 7 days) – **ideally an existing licensed coconut vendor** | Open stock, prep, accept offers, deliver, collect cash, clean | 2nd runner when > 20/day |
| Support (part-time) | Founder + WhatsApp Business app; later 1 PT agent | Replies to WhatsApp/email, calls customers who can't be found, handles refunds | When > 60 orders/day or > 10 tickets/day |
| Ops coordinator | none until 2nd–3rd beach | Roster, stock runs, cash counts, quality spot checks across 3 beaches (modeled US$650/mo) | Beach #3 |
| Don't hire yet | marketing manager, drivers, warehouse, full-time dev, customer-service team | | |

## 3. Supply chain & inventory

- **Sourcing:** standing order with 2 suppliers (primary + backup) for green/young coconuts delivered to the cart daily or every second day; spec: size/grade, fresh date, price per nut, rejection rule. Pilot assumption US$0.85/nut — **unvalidated**. Hurricane damage and lethal yellowing make supply the first real risk; secure 2 suppliers *before* launch and keep 1 day of buffer.
- **Cold chain:** insulated cooler boxes + ice (opened nuts are served cold). Ice supply contract/local ice plant.
- **Stock in the app:** `inventory.qty_available` per prep point/SKU. Today it is set by hand and never decremented (T-11) → at pilot, runner/founder updates the number at open and each restock; zone auto-flips to "not serviceable" at 0.
- **Waste:** husks and shells — arrange pickup by a farmer/compost user or the municipal collector; keep the cart area clean (beach operator will notice).
- **Safety:** machete/opener training, cut-resistant glove, first-aid kit, sunscreen/hydration breaks; sharp tools never carried while walking among bathers (open at cart, carry closed cup/nut with straw).

## 4. Order lifecycle (as built) and who is responsible

```
Customer: scan QR / open site → location → price → pay (card) or choose cash
          ↓ order created (PLACED) ; card captured → AWAITING_RUNNER ; cash → AWAITING_RUNNER (CASH_DUE)
System:   offers sent to every AVAILABLE runner at that beach (6-min accept window)
Runner:   Accept (first wins) → "Picked up" (prep done) → "Arriving" → hand over → enters customer's 4-digit code → DELIVERED
Money:    card = already captured; cash = runner collects, app adds to shift_cash
Customer: sees status page (polls every 5 s) + email; "I moved" button; call/WhatsApp runner
Ops:      admin board shows at_risk; can cancel+refund; pause zone
```

**Exceptions and who handles them**

| Situation | What happens now | Target SOP |
|---|---|---|
| No runner on shift / zone closed | Quote refuses ("not right now" + reason) | Show opening hours + WhatsApp |
| Paid, nobody accepts in 6 min | **Order stays `AWAITING_RUNNER` forever (T-4)** | Ops alert at 4 min → call runner → at 8 min auto-refund + apology + discount |
| Runner can't find customer | `ARRIVING` flag, call/WhatsApp, "I moved" | Two call attempts + 5 min → `UNDELIVERABLE` with reason → ops decides refund/redeliver |
| Customer moved / no-show, nut already opened | `UNDELIVERABLE`; resolution `FORFEITED` or `DISPOSED` per ops | Refund if our fault; cash orders: log loss (counts in the 3% loss budget) |
| Wrong/spoiled nut | Customer WhatsApps | Replace immediately (runner) or refund; photo; log reason |
| Rain/rough sea/lightning | Admin pauses zone with reason | Pause 1 tap; refund or reschedule open orders |
| Runner no-show | Zone has no available runner → not serviceable | Backup runner list of 2–3 on-call vendors |
| Phone dies / no signal | No offline queue (T-17) | Power banks (1 per runner); paper backup of the day's orders printed from admin at open |
| Chargeback / dispute | Gateway notice | Evidence pack = order events, delivery code, timestamps, photo |
| Fraud / prank orders | Cash orders can be no-shows | Phone verification for first cash order; limit 2 open cash orders per phone |

## 5. SOPs (one page each; draft the full text during week 2)

**SOP-1 Open the cart (15 min before hours):** staff sign in, runner starts shift in the app (`AVAILABLE`), count cash float (US$ and J$), count nuts/straws/ice, write stock into admin, clean station, check phone ≥ 80% + power bank, weather check (pause if lightning).
**SOP-2 Take and fill an order:** accept within 2 min; open nut (≤ 90 s) at the cart, straw, napkin; deliver walking, not running; check code on arrival; smile script; hand over; mark delivered; ask for a Google/TripAdvisor review with the QR card.
**SOP-3 Cash:** runner never carries more than US$40 / J$6,000 in the delivery pouch; drop into locked box at the cart every 10 orders; end-of-shift two-person count against `shift_cash.collected_cents`; variances > US$2 recorded and reviewed; deposit weekly by Operator.
**SOP-4 Refunds/complaints:** <10 min to first reply; refund ≤ US$20 without approval for undelivered/wrong/spoiled (document why); log in admin cancel flow so `refunds.actor_user_id` names a human.
**SOP-5 Weather/pause:** who may pause, standard customer message, resume checklist.
**SOP-6 Incident (injury, theft, harassment, allegation of illness):** stop, first aid/police, photograph, notify Operator within 15 min, insurer within 24 h, no admission of liability in writing.
**SOP-7 Close:** count, reconcile, stock write-back, runner ends shift, clean, secure equipment.
**SOP-8 Weekly:** review `/admin/analytics` (on-time %, accept time, cancellation reasons), roster, supplier invoice vs stock, payroll & statutory remittance by the 14th.

## 6. Capacity and logistics maths (modeled)

- One runner: prep 1.5 min + average walk 3–4 min (zone ETA 6–12 min) → ~2.5 orders/hr sustained, ~20/shift; peaks (cruise day, 12:00–14:00) need a second runner — roster an on-call vendor.
- Dispatch is "offer to all, first wins" — fine with 1–3 runners; if cherry-picking appears (far orders ignored), switch to push assignment (schema supports it).
- ETA promise: 6–12 minutes after acceptance, shown as a range (as built). Measure on-time = delivered ≤ `promised_eta_max_at`; gate ≥ 85%.

## 7. Equipment (essential only)

Per beach: cart or table + umbrella (US$600 incl. 2 coolers), openers/knives + cut gloves, cups/straws/napkins, branded tee/cap/lanyard QR, runner smartphone with case + power bank + data plan (US$180), lockable cash box, signage with QR. **Do not buy yet:** vehicles, second carts, sticker printers, drones, uniforms beyond 3 per runner.

## 8. Automation vs manual (pilot)

| Manual in pilot | Automate later |
|---|---|
| Stock counts, cash reconcile, partner commission payout, customer WhatsApp support, refunds above US$20, rosters | Inventory decrement/low-stock pause, auto-refund of expired orders (T-4 — build before card), review requests, commission statements, push offers to runners |

## 9. Reporting (weekly one-pager)
Orders, revenue, on-time %, avg accept time, cancellations by reason, refunds, cash variance, stock waste, support tickets, NPS/CSAT, contribution/order, orders per runner-hour, repeat rate, partner-attributed orders. All but NPS/waste/variance are already in `/admin/analytics`.
