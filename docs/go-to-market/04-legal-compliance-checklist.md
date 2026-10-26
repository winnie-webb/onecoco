# 04 — Jamaican Legal, Licensing, Tax & Compliance Checklist

**Read this first.** I am not a Jamaican attorney or accountant. The web search I could run returned *mostly secondary sources* (news, payroll-vendor sites, conference handouts); I could not retrieve the official fee schedules from Companies Office, TAJ, NEPA or the Ministry of Health. Each row therefore carries a **confidence** (H = official/consistent news report; M = reputable secondary; L = single or dated source / my background knowledge, **must be confirmed**). Verification date for everything: **2026-10-09**. Items marked ⚖️ need a Jamaican attorney, 🧾 an accountant, 🏛️ a regulator's written answer.

Classification of OneCoco's activity (drives what applies): a **retail food-and-beverage seller** (fresh coconut, opened on site) that **delivers on foot on a public beach**, takes **online payments from foreign tourists**, **employs** runners, and **collects personal data including location**. It does *not* (per the code) hold customer funds for third parties, sell alcohol, drive vehicles, or import goods. Business registration ≠ permission to trade on the foreshore; those are separate (rows B-1, B-2).

## A. Establishing the business

| # | Requirement | Status | Authority | Cost / time (official unless noted) | Must be done before launch? | Source / confidence |
|---|---|---|---|---|---|---|
| A-1 | **Incorporate a limited company** (recommended over a sole-trader business name: limited liability for food-injury and staff claims, cleaner investor/grant path) | Optional in law; **strongly recommended** | Companies Office of Jamaica (COJ) – orcjamaica.com | Third-party summaries: Articles of Incorporation ≈ J$24,000–24,500 + J$500 stamp duty; name search J$500, 90-day reservation J$3,000; next-day processing +J$3,000; annual return ≈ J$5,000. Time: days–2 weeks. | Yes (contracts, bank, insurance, gateway KYC all need an entity) | M/L — [COJ fee handout PDF](https://bjdc.mfaft.gov.jm/pdf/COMP_OF_JAM.pdf); confirm on COJ site |
| A-2 | **Business name registration** (only if trading under a name different from the company's, or sole-trader route) | Conditional | COJ | Old gazetted figures J$2,000–2,500 (2006 notice) — outdated | If name ≠ legal name | L — [JIS](https://jis.gov.jm/fees-increased-for-the-registration-of-business-names/) |
| A-3 | **Tax Registration Number (TRN)** for the company and each director | Mandatory | Tax Administration Jamaica (TAJ) | Free (L: my knowledge) | Yes | L — confirm |
| A-4 | **Bank account** (JMD + USD) in company name | Practical necessity | Commercial bank | Bank-specific | Yes | — |
| A-5 | **Employer registrations** for statutory payroll deductions (PAYE, NIS, NHT, Education Tax, HEART/NSTA) | Mandatory once you employ | TAJ (collects all five) | Free to register; remit by the **14th of following month** per secondary sources | Yes, before first runner is paid | M — [Observer 2026-07-10](https://www.jamaicaobserver.com/2026/07/10/taj-reminds-taxpayers-statutory-deductions-due-july-14/); rates below |
| A-6 | **Trademark** for the final brand name, logo | Optional, recommended | Jamaica Intellectual Property Office (JIPO) | Fee unverified | Before printing carts/QR; **name must be decided first** (D-03) | L |
| A-7 | **Domain name** | Practical | Registrar | `onecoco.com` held by a domain investor (Phase 0, 2026-09); alternatives listed in ARCHITECTURE §27.7 | Before payment return URLs and QR codes | — |

## B. Operating permissions — *the real gating items*

| # | Requirement | Status | Authority | Notes | Before launch? |
|---|---|---|---|---|---|
| B-1 | **Permission to vend on the specific beach** | **Mandatory; the single biggest unknown** | Beach owner/operator: Doctor's Cave Beach is described as *privately owned, charging admission* (travel sources); Walter Fletcher/Aqua Sol Beach Park is operated by the **UDC** (2017–18 notices; hours Wed–Sun 9–5 then — verify current). Other public beaches: NEPA/Beach Control Authority + parish municipal corporation | Get the operator's **written** exclusive or non-exclusive delivery/vending licence, incl. whether runners may enter, where the cart sits, hours, fee/rev-share, and whether existing licensed vendors object. Architecture's `requires_property_permission` = true on both seeded zones. 🏛️⚖️ | **Yes — hard blocker (D-02)** |
| B-2 | **Beach licence** for commercial use of the foreshore/floor of the sea | Conditional (depends on B-1 operator and whether OneCoco itself occupies foreshore) | Beach Control Authority (administered via NEPA) under the Beach Control Act; Beach Control (Licensing) Regulations 1956, amended 2015 | Exists in law (fees set in a schedule; 2015 amendment changed application process); I could not retrieve forms/fees; whether a roaming vendor under a hotel's/club's licence needs its own is unclear. 🏛️ | Ask in week 1 |
| B-3 | **Food handler's permit** for every person who prepares/handles food (cart staff and runners who open nuts) | **Mandatory** | Parish Health Department (Ministry of Health & Wellness / Regional Health Authority – Western RHA for St James) | Annual; training session + short test + medical exam; fee ≈ J$500 in a 2011 source (L). St James health officers have run vendor drives; <5% of >600 St James vendors held permits in 2022 (enforcement is real). | Yes — [JIS](https://jis.gov.jm/radio_programs/food-handlers-permit-a-must-for-food-vendors/), [Observer](https://jamaicaobserver.com/2020/01/15/food-handlers-permit-why-do-i-need-one-how-do-i-get-one) (M) |
| B-4 | **Food establishment / mobile food unit registration & inspection** of the cart | Conditional — likely applies to a fixed cart | Parish Health Dept (Public Health Act) | Could not retrieve requirements/fees. 🏛️ | Ask in week 1 |
| B-5 | **Vendor's licence / municipal trading permit** | Conditional — a 2024 Gleaner report on a Montego Bay vendor refers to an expired "vendor's licence"; penalties up to J$1M fine/12 months for health-reg violations | St James Municipal Corporation | Fee/process unverified. 🏛️ | Ask in week 1 |
| B-6 | **Fire / building / planning approval** for a cart | Unlikely for a mobile cart; confirm | Local authority | — | Confirm |
| B-7 | **TPDCo licensing** (tourism enterprises) | Probably N/A; TPDCo licenses categories of tourism operators and I found no vendor category for a delivery start-up | TPDCo | Ask whether delivery to hotel guests counts | Confirm |
| B-8 | **Liquor licence** — only if you ever add rum/cocktail coconuts | N/A at launch | Betting, Gaming & Lotteries / liquor licensing authority (parish) | **Do not add alcohol to the menu** without it; also changes insurance | Never at launch |

## C. Tax

| # | Requirement | Status | Detail | Source / confidence |
|---|---|---|---|---|
| C-1 | **General Consumption Tax (GCT)** | Conditional on turnover & product treatment | Standard rate 15%; registration required when annual taxable supplies exceed **J$15M (≈ US$95k)** per secondary sources; filing monthly (deadline wording conflicts: "25th" vs "last working day" — confirm). **Whether unprocessed coconut/coconut water is zero-rated or exempt must be confirmed.** Code seeds tax at 0 on purpose. | M/L — [PayPro Global summary](https://payproglobal.com/saas-sales-tax/jamaica/) (vendor page, **not** official). 🧾 |
| C-2 | **Corporate income tax** | Mandatory on profits | 25% standard company rate (background knowledge — L); loss-making year 1 → file returns, carry losses forward. | L 🧾 |
| C-3 | **Payroll taxes 2026/27** | Mandatory once employing | Employee: NIS 3% (stops at J$5M gross/yr), NHT 2%, Education Tax 2.25% of statutory income, PAYE 25% above **J$1,902,360** (30% above J$6M). Employer: NIS 3%, NHT 3%, Education Tax 3.5%, HEART/NSTA 3% (≈ **12.5%** on-cost, modeled). HEART small-payroll exemption wording conflicts across vendors. | M — payroll-vendor sources, e.g. [YaadBooks](https://yaadbooks.com/blog/nht-nis-calculation-jamaica-2026); not TAJ. 🧾 |
| C-4 | **Minimum wage** | Mandatory | **J$17,000 per 40-hour week (J$425/h), effective 1 Jul 2026**; overtime J$637.50, double-time J$850 | H — [JIS](https://jis.gov.jm/minimum-wage-moves-to-17000-up-from-16000/), Gleaner 2026-06-24 |
| C-5 | **Tips to staff** | Needs ruling | The product has no tip feature; tips are taxable employment income. Decide before adding (D-10). | 🧾 |
| C-6 | **Customs** | N/A | Local coconuts; no imports. Imported supplies (straws, cups) bear normal import duty/GCT at purchase. | — |

## D. Employment

| # | Requirement | Detail |
|---|---|---|
| D-1 | **Employees, not contractors** | Runners wear a uniform, work assigned shifts at assigned beaches with company equipment and a company app — facts that point to employment. Misclassification exposes the company to back NIS/NHT/Ed-tax/HEART and Labour Ministry claims. The pay design in doc 03 (guaranteed shift pay + per-delivery bonus) is an *employee* structure. ⚖️ |
| D-2 | Written contracts, Holidays with Pay, Termination & Redundancy rules, OSH basics (sun/heat, sand-walking, cash-handling) | Standard; attorney template. |
| D-3 | Workers' compensation / personal accident cover | Not statutorily universal in Jamaica for all staff (L) — **buy accident cover anyway** (cuts, sunstroke, cart incidents). Insurance broker. |

## E. Data protection, consumer and payments law

| # | Requirement | Status | Detail | Source / confidence |
|---|---|---|---|---|
| E-1 | **Data Protection Act, 2020** — register as **data controller** with the Office of the Information Commissioner (OIC); renew annually (on/before Dec 1 each year per OIC notice) | **Mandatory** — OneCoco collects names, phones, emails, **precise location**, delivery photos | Act in force 1 Dec 2023; online registration only; fee set by the Data Protection (Data Controller Registration) Regulations, 2024 — **fee not retrieved**. Practical duties: privacy notice at collection (T-5), purpose limitation (location used only for delivery — matches the code's truncation job), retention schedule (code: exact point kept until delivered/cancelled + 30 days then truncated to zone), data-subject access/deletion procedure, breach reporting (timelines — confirm), contracts with processors (Supabase, Vercel, Resend, PayPal/gateway, PostHog). | M — [OPM/OIC](https://opm.gov.jm/the-office-of-the-information-commissioner/), [JIS](https://jis.gov.jm/?p=342663). ⚖️ |
| E-2 | **Consumer Protection Act, 2005** (+ **Electronic Transactions Act, 2006** for online sales) | Mandatory | Goods must be fit for purpose; remedy = repair/replace/refund; a posted "no refunds" sign does not override statutory rights (CAC statement Aug 2026). Online-sale disclosure and refund obligations come via the ETA; I could not retrieve the specifics. Publish a clear refund policy: refund if never delivered, wrong item, or spoiled; no "change-of-mind" refund once opened. | M — [Gleaner 2026-08-22](https://jamaica-gleaner.com/article/news/20260822/consumer-affairs-encourages-smart-back-school-shopping), [Observer 2009](https://jamaicaobserver.com/2009/12/01/consumer-rights-returning-goods-and-requesting-refunds). ⚖️ |
| E-3 | **Payments regulation** (Bank of Jamaica) | Probably N/A | OneCoco collects only its own sales proceeds through a licensed processor; it must **not** hold or forward funds belonging to others (e.g., partner commissions paid from customer funds are fine as an expense). If group-order "invoicing on behalf of operators" is added, re-check. | L 🏛️ |
| E-4 | **Card processor/gateway terms** | Mandatory (contractual) | PayPal/WiPay require published refund policy, contact details, accurate descriptors; both can freeze funds on disputes. | — |
| E-5 | **Cash handling** | Practical | Daily count, two-person sign-off, safe drops (SOP in doc 05). | — |

## F. Insurance, contracts, IP

| # | Item | Status |
|---|---|---|
| F-1 | **Public liability + product liability** (coconut machete injury, foreign-body/food-borne illness claim) | Mandatory in practice (beach operators, hotel partners and PayPal-risk reviews will ask for a certificate). Get 3 broker quotes (D-11). |
| F-2 | **Partner/hotel agreement** (QR placement, concierge, commission, indemnity, data sharing) | Needed before partner #1. Attorney template. |
| F-3 | **Supplier agreements** (coconut farmers/wholesalers: price, grade, delivery, cold chain, traceability) | Needed before launch, simple purchase terms fine. |
| F-4 | **Staff contracts + Code of conduct (cash, tourist harassment, safety)** | Before first shift. |
| F-5 | **Website Terms, Privacy Notice, Refund & Cancellation Policy, Cookie notice** | Before accepting any order (T-5). |
| F-6 | **Intellectual property**: own the brand artwork, photos, code (assignment from contractors/the original developer if not founders) | Before fundraising or sale; check who holds copyright in the repository's code and the 3D/sticker assets. |

## G. Order of operations (shortest path)

Week 1: attorney + accountant engaged; name decided; COJ name search/reservation → incorporate; in parallel, written enquiries to the beach operator, NEPA/BCA, Western RHA and St James Municipal Corporation (B-1…B-5). Week 2: TRN, bank account, employer registrations, OIC registration, insurance quotes, food-handler training booked. Week 3: contracts signed, permits in hand, privacy/terms live. **No public launch until B-1 is in writing and B-3 permits exist.**

## H. Open questions for professionals (see doc 10)
GCT status of coconut; GCT registration timing; whether runner pay structure triggers any special tipping/commission rules; whether a mobile cart on a private beach needs municipal and health licences separately; OIC fee; breach-notification deadline; how to treat USD sales for tax (rate used); PayPal proceeds treatment.
