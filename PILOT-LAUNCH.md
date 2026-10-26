# Pilot launch — Harmony Beach Park

What changed for the pilot, and the steps to go live. Everything below was
run against a local Supabase stack (all 22 migrations + seed) with the app in
a 390px browser: GPS order, no-GPS order, runner accept ×2, map and call links,
admin board, stock count, out-of-stock refusal, expiry, cancel, late shift
start, and the anon-key lockdown on the new functions.

## What changed

- **Harmony Beach Park is the pilot beach.** Seeded `OPEN`, 09:00–17:00 daily,
  US$2 delivery, **50 coconuts** in stock. The zone is a generous box around
  NEPA's centre point (18.4763, -77.9259), not a surveyed boundary. Doctor's
  Cave and Walter Fletcher stay `CLOSED`.
- **Stock counts down.** Each order takes its coconuts when placed (Coco for
  Two takes 2). Cancelled, expired, abandoned or failed-payment orders put
  them back. At 0 the beach stops taking orders. Set the count at
  **/admin/products → Coconuts in stock**.
- **Personalisation is off.** No names, messages, designs, occasions, extras
  or stickers anywhere in checkout or on the site; `/build-your-coco`
  redirects to `/order`. The builder code and the customisation data are kept
  so it can come back later (see the seed comment).
- **The team is told about every order.** When an order is ready to deliver
  (cash placed, or card paid) a message goes to `ORDER_ALERT_WEBHOOK_URL`
  and/or `ORDER_ALERT_EMAILS` with items, cash-or-paid, name, phone, landmark,
  description and a Google Maps link.
- **Orders aren't auto-refunded within minutes.** Runners have 15 minutes to
  accept, then the order sits on the admin board's at-risk list for 45 more
  before it is cancelled and refunded (~1 hour). A runner who starts their
  shift after an order came in is offered it immediately. A runner can hold
  up to 5 orders at once (was 1).
- **Finding the customer.** Runner delivery page and admin board show the
  customer's name, a tap-to-call phone number and an **Open map** link to
  their GPS point. The admin board can chime on new orders ("Turn on sound").
- **No GPS, still a sale.** If location is denied, fails, or lands just
  outside the zone, the customer can tap "I'm at Harmony Beach Park" and must
  describe where they are.
- Card orders now get an "order received" email before payment instead of
  "confirmed".
- Security: service-only database functions (stock, order location,
  `accept_order_offer`, sweep functions) can no longer be called with the
  public key.

## Go-live steps

1. Merge this branch into `main` (it carries the whole working app).
2. Supabase (Pro): `npx supabase link --project-ref <ref> && npx supabase db push`,
   then run `supabase/seed/jamaica.sql` once.
3. Vercel (Pro — the sweep runs every 5 minutes): set every variable in
   `.env.example`, especially `NEXT_PUBLIC_SITE_URL` (the real https domain),
   `CRON_SECRET`, `ORDER_ALERT_WEBHOOK_URL` and/or `ORDER_ALERT_EMAILS`,
   `NEXT_PUBLIC_CONTACT_*`, and for card payments `PAYPAL_*` with
   `PAYPAL_ENVIRONMENT=live`. Without PayPal the site is cash-only.
4. Create accounts (README → "Creating a local admin/runner account", against
   production): one admin per founder, and a runner account for whoever
   delivers — runner `home_beach_id` = Harmony Beach Park. Admin and runner
   are separate logins.
5. `npm run check:production`, then stand on the sand and run
   `npm run check:zones` with a few real pins; tighten the polygon if needed.
6. Each day: runner opens `/runner/today` → **Start shift** (the beach only
   takes orders while someone is on shift), and **End shift** when leaving.
7. Dry run: 5 test orders on the beach before telling anyone.

## Known limits

- The zone boundary is unsurveyed (deliberately generous).
- Harmony Beach Park is run by the UDC; their vendor rules still apply.
- Tax is 0 until an accountant confirms GCT treatment.
- PayPal and Resend are still unverified against live accounts.
