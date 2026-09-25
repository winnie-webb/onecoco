# Phase 1 — Brand & Landing

Architecture and decisions: `C:\Users\naviget\.claude\plans\one-coco-master-ethereal-teapot.md`

## Completed

- **Next.js 16.3.5 + React 19 + TypeScript + Tailwind v4** scaffold, App Router.
- **Design system** as CSS tokens in `app/globals.css` — deep Caribbean green
  (`jungle-*`), young-coconut lime (`lime-*`), warm sand (`sand-*`).
- **Name-agnostic brand layer.** `lib/brand.ts` is the single source of the
  name; `<Wordmark/>` + `<CocoMark/>` hold the lockup. Verified: the literal
  brand name appears in **no other file** in the codebase.
- **Marketing surface**: landing page (hero, menu, how-it-works, Build Your
  Coco teaser, partners, final CTA), plus `/how-it-works`,
  `/build-your-coco`, `/partners`.
- **Honest `/order` placeholder** — ordering is Phases 2–3 and says so, rather
  than leading the primary CTA to a 404 or a mock checkout.
- `robots.ts` + `sitemap.ts`, driven off `NEXT_PUBLIC_SITE_URL`.
- Skip link, semantic landmarks, `prefers-reduced-motion`, 16px input floor,
  branded focus rings.

## Tested

- `npm run build` green — **all 8 routes prerendered static**. `tsc --noEmit`
  clean. `eslint` clean.
- Driven by hand at **375px**, 352px, and 1280px. No horizontal overflow at
  any width.
- Browser console: **no errors**.
- All routes return 200; unknown route 404s correctly.
- **Zero client-side JavaScript for interactivity** — the mobile menu is a
  `<details>` disclosure, tested open/close. This is deliberate: the audience
  is on beach cell signal.
- Contrast audited programmatically across 125 text nodes against computed
  backgrounds *and* gradient stops.
- **Payload measured on a real production build**, not estimated:

  | | Measured | Plan budget | |
  |---|---|---|---|
  | HTML (gzip) | 11.1 KB | < 30 KB | pass |
  | CSS | 7.3 KB | — | |
  | Fonts | 31.8 KB (1 file) | — | |
  | **JS** | **135.5 KB** | **< 120 KB** | **over** |
  | Images | 0 requests | — | |
  | Total first load | 174.1 KB | — | |

## Fixed during the phase

1. **Eyebrow contrast.** `text-lime-ink` (the dark lime that exists because
   lime-on-white is ~1.6:1) was being used on dark green panels, where it was
   nearly invisible. `<Eyebrow>` now takes a `tone`.
2. **`sand-400` at 4.41:1** against the lightest stop of the CTA gradient —
   just under the 4.5 needed for 14px text. Bumped to `sand-300` (6.02:1).
3. **Tailwind display conflict.** The header CTA carried `hidden sm:inline-flex`
   over a base `inline-flex`; same specificity, so stylesheet order decided and
   it rendered at 375px anyway. Resolved by making the primary CTA always
   visible and removing the duplicate from the dropdown.
4. Button labels wrapping at very narrow widths (`whitespace-nowrap`).
5. **Font payload halved.** Two families cost 79.4 KB on first paint for a page
   whose body copy is a few short paragraphs. Consolidated to one variable
   family: 31.8 KB, one file, and the page reads more cohesively for it.

## The one budget miss

**JS is 135.5 KB against the plan's 120 KB budget**, on a page with *zero*
client components and no client-side interactivity at all. That is the
Next.js App Router + React 19 runtime floor, not application code — there is
nothing of mine left to remove.

Two honest options, neither urgent:
- **Revise the budget to ~140 KB** and keep the framework. The marketing pages
  are fully static and cache well; the number that actually hurts on beach
  signal is first-paint HTML, which is 11 KB.
- **Statically export the marketing surface** so it ships no React runtime at
  all. Real work, and it fragments the codebase before the ordering app exists.

Recommend the first for now and revisiting once Phase 3 shows what the ordering
path actually costs — that is the page where the JS genuinely matters.

## Known gaps

- **No photography.** The hero and Build Your Coco previews are CSS/SVG
  compositions, clearly illustrative. Real imagery is the single biggest
  visual upgrade available and needs: coconuts being cut, a Montego Bay beach,
  tourists holding cocos, a personalised shell.
- **`lib/marketing-menu.ts` holds display prices** ($7 / from $9 / $12). These
  are marketing copy, not a pricing source — Phase 2 replaces them with the
  `products` table. Nothing may import them into an ordering path.
- **The mark is a placeholder.** Deliberately a generic coconut-and-straw glyph
  so it survives the rename; it is not a finished identity.
- No OG image yet (metadata is wired, the asset is not).
- Brand name and domain still open — see plan §27.6 and §27.7.

## Next: Phase 2

Supabase schema + migrations + seed, location capture, zone and serviceability
resolution, catalogue, analytics instrumented. First external account needed.

## Running it

```
npm run dev
```
Port 3000 was occupied during development, so `.claude/launch.json` is set to
3100 with `autoPort`.
