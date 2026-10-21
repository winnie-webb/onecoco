# 10 — Founder Decision Register

Questions the code and public sources cannot answer. **Needed by** is relative to the roadmap (doc 09). "Default" is what I assumed in the plan — change it and the model/plan must be updated.

## A. Decisions required (blocking or near-blocking)

| ID | Decision / question | Why it matters | Needed by | Default assumed | Owner |
|---|---|---|---|---|---|
| D-01 | **Which branch is the product?** Adopt `main-mf4ule` (full app) as trunk; shelve the 3D/sticker customiser on `main`? | Two never-merged lines; only one can take orders | Day 1 | Yes: trunk = `main-mf4ule`; customiser deferred | Both |
| D-02 | **Which beach(es) and is operating permission secured or obtainable in writing?** (Doctor's Cave club? UDC/Walter Fletcher? other?) Who are the contacts? Any prior conversations, exclusivity, revenue share asked? | Hard launch gate; also determines zone, hours, fees | Day 7 | Unknown; assume MoBay Hip Strip with a rev-share/fee of ~US$500 up-front placeholder | OPR |
| D-03 | **Final brand name and domain?** Is "One Coco" final? Will you buy `onecoco.com` from the investor or pick another? | QR codes, carts, trademark, payment return URLs | Day 14 | Keep "One Coco" working name; use an alternative domain until decided | Both |
| D-04 | Has anyone interviewed real beach customers or vendors? Any evidence of demand (waitlist, pre-orders, surveys)? | Demand is unproven | Day 7 | None; run the 7-day validation | OPR |
| D-05 | **Payment rail:** PayPal, a local gateway (WiPay/bank), or both? Do you have or can you open a PayPal business account in Jamaica and a path to withdraw to a JMD/USD bank? | T-1; fees; cash-flow timing | Day 10 | Apply to both; whichever approves first | OPR |
| D-06 | **Currency policy:** tourists pay USD; locals JMD? Posted exchange rate for cash? Show JMD prices? | Checkout, cash reconciliation, tax | Day 14 | USD list prices; JMD cash at a posted daily rate | Both |
| D-07 | **Price:** accept US$7 + US$2 as the starting point and run the price test? Free delivery on Coco for Two? | Revenue, conversion | Day 14 | Yes | Both |
| D-08 | **Employee vs contractor runners; guaranteed shift pay + per-delivery pay structure; willing to hire an existing vendor?** | Legal on-cost (~12.5%) and the break-even | Day 14 | Employees, guaranteed J$5,700/day loaded + J$160/delivery | OPR+ATT |
| D-09 | **Founder compensation and time:** unpaid? hours per week? who is on the beach? Is any founder technical enough to run P0 work or do you hire a contractor (~US$3.5k)? | Cash plan; capacity | Day 7 | Unpaid; contractor for 100 h | Both |
| D-10 | **Tips:** allow tips for runners? (tax/payroll treatment) | Product + payroll | Day 30 | No tips at launch | Both |
| D-11 | **Insurance appetite:** public + product liability limits; who is the broker? | Partners and PayPal ask for a certificate | Day 14 | 3 quotes | OPR |
| D-12 | **Funding:** how much cash is committed, from whom, and on what terms? Minimum J$2.0M to launch safely; J$6.0M recommended | Cannot fund 90 days otherwise | Day 7 | Founders + F&F | Both |
| D-13 | **Hours, days, and seasonality:** 09:00–17:00 daily (seed) or fewer? Closed Mondays? | Idle pay vs revenue | Day 14 | Hours set by beach operator + demand | OPR |
| D-14 | **Who owns the IP/code?** Is the repo (and any contractor/AI-assisted work) assigned to the company? | Investors, sale, trademark | Day 30 | Assign to the company on incorporation | Both |
| D-15 | **Personalisation:** physical printed stickers at launch or defer? | Ops complexity, inventory | Day 14 | Defer | Both |
| D-16 | **Capture timing for card:** capture at checkout (current) vs authorise now/capture on accept? | Fees on refunds (expired orders) | Day 21 | Capture at checkout + T-4 auto-refund | CTO |
| D-17 | **Coconut supply:** do you have a supplier/farmer relationship? price per nut? | Margin and reliability | Day 7 | US$0.85/nut unvalidated | OPR |
| D-18 | **Alcohol / rum add-on?** (needs a licence) | Legal | Never at launch | No | Both |
| D-19 | **Partner commission rate** for hotels/villas | Margin | Day 21 | 10% of order | Both |
| D-20 | **Legal structure:** limited company with both founders as directors/shareholders; split? vesting? | Disputes later | Day 10 | 50/50 with vesting (attorney to advise) | Both |

## B. Assumptions needing validation (owner = whoever runs the test)

| # | Assumption in the model | Test | Threshold |
|---|---|---|---|
| V-1 | Mature 16 orders/day/beach | Pilot data by beach/season | ≥ 9 to expand |
| V-2 | Average basket US$8.00 + US$2 delivery | Pilot orders | within ±10% |
| V-3 | Coconut US$0.85/nut | 3 supplier quotes | ≤ 1.30 |
| V-4 | Card fee 6% + US$0.49 | Gateway contracts | actual rate |
| V-5 | 60% of orders on card | Pilot mix | — |
| V-6 | 20 orders/runner-shift capacity | Time & motion on 3 days | ≥ 16 |
| V-7 | Runner guaranteed pay US$36/day loaded | Payroll quote | ±15% |
| V-8 | 1.3 orders per tourist | Repeat data | ≥ 1.2 |
| V-9 | Seasonality factors | 4 weeks of data + hotel occupancy | refine |
| V-10 | Beach vending/permit costs ≈ US$500 | Operator/NEPA answers | — |
| V-11 | Tourists will pay ~US$9 delivered | Survey + price test | ≥ 35% yes |
| V-12 | Existing vendors will cooperate | 8–10 interviews | ≥ 3 interested |
| V-13 | GCT treatment of coconut | Accountant | written |
| V-14 | Doctor's Cave/Walter Fletcher operating after Melissa | Site visit | open & staffed |

## C. Items I could not verify and need a professional or the regulator
COJ official fees; TAJ registration steps and GCT treatment; NEPA/BCA licensing for roaming vendors; parish health vendor/premises licence fees; OIC registration fee; Consumer Protection/ETA refund specifics; PayPal-to-bank withdrawal; WiPay fees/settlement; current coconut and beach-vendor prices; Doctor's Cave/Walter Fletcher status.
