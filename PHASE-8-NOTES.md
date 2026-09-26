# Phase 8 — Build Your Coco: Full Personalisation + Preview

## Completed

- **`components/order/CocoPreview.tsx`** — a real, live-updating SVG
  preview, built on Phase 1's `CocoMark` silhouette (same shape, so it
  still reads as the same brand mark, not a new asset). Reflects the
  actual selections: design (a distinct small accent per option —
  Jamaican, Tropical, Romance's heart, Birthday's candle + confetti, all
  drawn from the existing green/lime/sand token palette, nothing off-brand
  introduced), name, message, and extras (lime wedge, a second straw,
  spoon, a water droplet) — each one a real prop, not a fixed illustration.
  Still CSS/SVG, no photography (PHASE-1-NOTES.md's known gap stands
  unchanged).
- **Wired into the real, DB-backed `ProductPicker`** (`/order`) — the same
  component that builds the `CartItem` sent to `/api/v1/quote`. This is
  the load-bearing part of the phase: what you see updating live *is* what
  gets priced and ordered, not a separate demo that happens to look
  similar.
- **A genuinely interactive demo on the marketing `/build-your-coco`
  page** (`components/marketing/InteractiveBuilder.tsx`) — local state
  only, no database, no pricing, same "no ordering logic on marketing
  pages" boundary Phase 1 drew. `BuildTeaser`'s original static
  illustration is untouched and still used on the homepage teaser
  specifically to keep that section's zero-JS budget (PHASE-1-NOTES.md);
  the new interactive version is scoped to the dedicated
  `/build-your-coco` page, where the extra JS is the actual point of the
  page.

## Tested

- **Driven in a real browser at 390px** with the zone temporarily opened
  locally (reverted after, as in every prior phase): filled in a name and
  message, picked Birthday, toggled Lime, and confirmed the marketing
  demo's preview updated live — the candle/confetti accent, the lime
  badge, and both text fields all present in the rendered screenshot, not
  asserted from reading the component.
- **Then did the same inside the real `/order` flow**: picked Coco for
  Two, entered a name, picked Romance, toggled Extra straw, and confirmed
  the *same* component rendered correctly there too — the heart accent,
  the name, the "ROMANCE" label — inside the actual checkout path, with a
  real zone resolution and real pricing already computed above it on the
  same screen.
- Caught and fixed a **test-only** artifact along the way, not an app bug:
  an early screenshot looked like the preview graphic was missing —
  `getByPlaceholder(...).fill()` had scrolled the input into view, and a
  subsequent `scrollTo(0, 0)` didn't take effect before the screenshot
  because the page has `scroll-behavior: smooth` (a pre-existing, Phase-1
  global style) and the animated scroll hadn't finished. Fixed the test
  with `scrollTo({ behavior: "instant" })` — worth remembering for any
  future test that scrolls and screenshots on this codebase.
- `npm run build` green (36 routes, `/build-your-coco` still prerenders
  static — the new interactive builder is client-only state, no server
  data dependency). `tsc --noEmit` clean. `eslint` clean. `npm test` still
  19/19 (no new isolable pure logic this phase — `CocoPreview` is a pure
  render of props, verified visually rather than unit-tested, since its
  entire job is what it looks like).

## Known gaps

- **No real photography**, still — the single biggest visual upgrade
  available, per every phase since Phase 1, remains not this codebase's to
  produce.
- **Design accents are simple, recognizable shapes, not finished
  illustration** — a candle, a heart, a couple of leaf strokes. Honest
  placeholders in the same spirit as the wordmark itself
  (PHASE-1-NOTES.md: "deliberately a generic coconut-and-straw glyph").
- **The marketing demo and the real picker are two separate pieces of
  state** (one local-only, one driving a real cart) — by design, not an
  oversight (marketing pages don't touch the database, §22/Phase 1), but
  worth being explicit that playing with the demo doesn't carry your
  choices into `/order`; you re-enter them there.
- **No preview for `qty > 1`** — the preview shows one coconut regardless
  of the quantity selected in `ProductPicker`. A minor gap given the
  primary use case (Build Your Coco is inherently a single, personalized
  item) but worth noting if Coco for Two's personalization ever needs its
  own two-shell preview.

## Next: Phase 9

Partners, QR attribution, commissions, group/scheduled orders. No
external dependencies. `orders.partner_id`/`qr_code_id`/`campaign_id` have
existed since Phase 0 specifically so this phase never needs to backfill
attribution — this phase is mostly the partner-facing surface and the QR
capture path over already-present schema.
