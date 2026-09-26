# Build Your Coco: 3D Customiser Plan

Status: **M1–M3 built, M4 partly** (see §10). Decisions from the owner (2026-09-26) are in §8: printed stickers, garnish stocked at prep points, extras priced separately. This covers Phase 8 of `docs/ARCHITECTURE.md` §25 ("Build Your Coco: full personalisation + preview") and makes the preview a live, interactive 3D coconut.

The main constraint is **speed**. The customer is a tourist on a beach, on a mid-range phone with weak signal. If the 3D view is slow to load, janky while you type, or drains the battery, it hurts sales more than having no 3D at all. Every decision below follows from that.

---

## 1. What we're copying from the real world

Custom coconuts are already sold at weddings, resorts and brand events ([Coconut Store](https://www.coconutstore.net/custom-coconuts-weddings), [The Bay Coco](https://thebaycoco.com/), [Nauti Coconut](https://www.nauticoconut.com/custom-branded-coconuts/), [Etsy engraved coconuts](https://www.etsy.com/market/coconut_engraved)). The product always looks about the same:

- A **young drinking coconut, trimmed down to the white husk**: flat base, conical top, cut crown, straw.
- Personalisation is **laser-engraved** (brown burn on white husk), **ink-stamped**, or a **printed decal/sticker**.
- Content is a **name, a date, a short message or hashtag**, plus a small motif (hearts, palm, logo).
- Garnish makes the photo: hibiscus flower, lime wedge, paper umbrella, coloured straw.

Our builder should let the customer make exactly that, and see it before they buy.

**We're going with printed colour stickers**, not engraving or carving. A sticker printer at the prep point is cheap, fast and needs no special skill, it can print in full colour, and it can print from the same file the customer saw in the preview.

## 2. What the customer can do

The groups match the existing schema (`supabase/seed/jamaica.sql`), with a few new rows added.

| Control | Input | Shows on the 3D coconut as | Schema |
|---|---|---|---|
| **Name** | text, ≤ 20 | Big text on a colour sticker on the front of the husk | `name` (exists) |
| **Message** | text, ≤ 40 | Smaller line under the name ("Jamaica 2026"), on the same sticker | `message` (exists) |
| **Design** | Jamaican / Tropical / Romance / Birthday | Sticker artwork and colours: flag stripes, palm leaves, hearts, confetti | `design` (exists) |
| **Occasion** | select | Sets default design and message placeholder ("Just Married", date) | `occasion` (exists) |
| **Font** | 3 choices (Bold, Script, Classic) | Text style | **new** `font` SELECT |
| **Straw** | 4 colours | Straw mesh colour | **new** `straw` SELECT |
| **Sticker shape** | Round / Oval | Outline of the sticker | **new** `shape` SELECT |
| **Garnish** | Hibiscus, lime wedge, umbrella | Small 3D props on the crown | extends `extras` |

Interaction:
- **Drag / swipe to spin** the coconut, with inertia; it snaps back to the front when released. No pinch-zoom: it adds nothing on a phone and gets in the way of page scroll.
- **Typing updates the coconut on the next frame.** No "apply" button.
- **"Share my coco"** saves a PNG of the current view for WhatsApp/Instagram. The existing copy says "it's the one that ends up on the grid", so this is the feature that drives word of mouth.
- **"Add to order"** puts a cart line with the chosen customisations into the Phase 3 cart.

Emoji: a colour sticker *can* print "Jamaica 2026 ❤️", but every phone draws emoji differently, and a full colour-emoji font is several MB. So hearts, stars, palms, suns and similar become **our own small SVG glyphs** chosen from a picker, drawn the same everywhere. Typed emoji are removed from the input. What the customer sees is exactly what prints.

## 3. Speed budget (the acceptance criteria)

These numbers are the definition of done. They get measured on a real low-end Android phone (Moto G-class) with Fast 3G throttling, not estimated.

| Metric | Budget |
|---|---|
| Page first paint | Unchanged from today: static HTML, preview visible **immediately** |
| 3D code (gzipped, lazy chunk) | **≤ 30 KB** total, including our code |
| 3D asset downloads | **0–1 requests, ≤ 40 KB** (no GLB models, no HDRIs) |
| Chunk loaded → first 3D frame | **< 100 ms** |
| Keystroke → updated coconut | **< 16 ms** (same frame) |
| Frame rate while spinning | **60 fps** on target device, never below 45 |
| GPU/CPU when nobody is touching it | **0**: nothing re-renders while idle |
| JS added to the initial page load | **0 KB**: 3D loads after first paint |

For scale: a React Three Fiber + drei + three.js setup is typically **200–300 KB gzipped** before any model. That on its own would break the existing 120 KB JS budget (§20) twice over. So we don't use it.

## 4. How we keep it fast

### 4.1 Tiny renderer, no framework

- Use **[OGL](https://github.com/oframe/ogl)** (a minimal WebGL library, roughly 10–20 KB gzipped for the parts we need) or around 300 lines of hand-written WebGL2. **Recommendation: OGL.** It saves writing the orbit/texture/mesh plumbing and stays within budget. The M0 spike (§7) confirms the size.
- The customiser is a **single `"use client"` leaf** (`components/order/CocoBuilder`, already listed in ARCHITECTURE §17). Everything else on the page stays a Server Component.

### 4.2 No model files: the coconut is generated in code

- A trimmed young coconut is a **shape of revolution**. The mesh is a lathe built from a profile curve of about 20 points (flat base → belly → cone → cut crown). That's around 3k triangles, generated in under 1 ms, with **zero bytes to download**.
- The husk surface (fibrous white/cream) comes from **procedural noise in the fragment shader**, so there's no texture download. A single ≤ 40 KB WebP detail texture is the only allowed fallback if the procedural version looks wrong.
- Lighting is a **baked, hand-tuned shader**: one key light, a warm sky/sand hemisphere term and a soft rim. No PBR environment maps and no shadows. A fake contact shadow is a blurred ellipse drawn as a quad.
- Straw, lime wedge, hibiscus and umbrella are **tiny procedural meshes** (a tube, a wedge, 5 petals, a cone). They're built only when selected.

### 4.3 The sticker: one 2D canvas, reused everywhere

This is the most important design choice.

- One function, `drawSticker(ctx, spec)`, draws the sticker (shape, background colours, design artwork, name, message, glyphs) onto a **2D canvas at the real sticker's aspect ratio** (e.g. 2 × 2.5 in, drawn at 512 px for the preview).
- In 3D the sticker is a **decal**: the canvas is uploaded as a texture and projected straight onto the front of the husk (a flat projection, since a small sticker lies almost flat on the coconut). The shader adds a thin white border and a faint gloss highlight so it reads as a vinyl sticker. No engraving or bump-mapping maths is needed, which keeps the shader small.
- On each keystroke we redraw the canvas and re-upload the texture, with **at most one upload per animation frame**. At 512 px that costs well under a millisecond.
- **The same `drawSticker` also produces:**
  1. the no-WebGL 2D fallback preview,
  2. the share PNG,
  3. the **print file for the prep point**: the same drawing at **300 DPI at the exact sticker size**, ready for the label printer.

  So what the customer sees is exactly what gets printed. There's no second rendering path to drift out of sync.

Fonts: reuse the display font the page has already loaded (0 extra bytes). The two extra font choices are **subset to Latin** (~15 KB each), load only when picked, and redraw on `document.fonts.load()`. Print files embed nothing: they're flat images.

### 4.4 Render only when something changes

- **No continuous animation loop.** We draw a frame only when input changes, while a drag is active, or while spin inertia is settling. After that the canvas stays idle, so battery and CPU use drop to nothing.
- Pause entirely when the canvas scrolls off-screen (`IntersectionObserver`) or the tab is hidden.
- Cap `devicePixelRatio` at **2**, or **1.5** on low-memory or low-core devices (`navigator.deviceMemory`, `hardwareConcurrency`). This is the single biggest fill-rate saving on phones.
- `antialias: true` only when DPR ≤ 1.5; above that the extra pixels do the job.

### 4.5 Progressive loading: never a spinner

1. **Server-rendered static preview** (SVG coconut + HTML text overlay, reusing `CocoMark`-style art) paints with the page. Typing into the form updates it straight away.
2. After first paint, `requestIdleCallback` (or the first tap on the preview) triggers a `dynamic import()` of the 3D chunk.
3. The 3D canvas renders its first frame **underneath**, then cross-fades in over the static preview. If loading takes 5 s on bad signal, the customer never notices, because the static preview was already working.
4. **Stay on the 2D preview** when there's no WebGL, `navigator.connection.saveData`, or a WebGL context loss. With `prefers-reduced-motion` the 3D view still loads (it never moves on its own) but spin inertia and the snap-back animation are off. It uses the same `drawSticker`, so it's still an accurate preview.

### 4.6 State lives in the form, not in the 3D

- Builder state is a small typed object (`CocoSpec`) held in a reducer and **mirrored into the URL** (`?name=Sarah&design=jamaican…`). Links are shareable, back and refresh work, and the 3D view is a pure function of `CocoSpec`.
- The 3D module exposes only `mount(canvas)`, `update(spec)`, `snapshot()` and `dispose()`, with no React inside it. React never re-renders the canvas.

## 5. Data & ordering integration

- **No migration needed.** All the new controls and prices in §8 are `customization_groups` / `customization_options` **seed rows** in `supabase/seed/jamaica.sql`. Pricing stays server-side through the existing quote flow (`quotes` table, ARCHITECTURE §9). The client price shown is only a display value.
- A `CocoSpec` maps 1:1 to `order_item_customizations` rows (`text_value` for name/message, `option_id` for the rest). `label_snapshot` keeps old orders readable.
- **Server-side validation** (never trust the client): lengths, allowed character set (letters, numbers, basic punctuation, our glyph codes), message requires a name (§8), a profanity/slur blocklist on name and message, and ops can reject an order that slips through.
- **Prep point view** (Phase 4/6 surfaces) shows the order's sticker and a **"Print sticker"** button. It renders `drawSticker` at 300 DPI and opens the normal print dialog, sized to the label roll. That's no driver integration for v1. Automatic printing when an order arrives can come later.
- Garnish is checked against prep point `inventory` like any other stock, so a customer is never offered a hibiscus the prep point has run out of.

## 6. Analytics (PostHog, already planned)

`builder_viewed`, `builder_3d_ready` (with load ms and device tier), `builder_field_changed`, `builder_shared`, `builder_added_to_order`. The key comparisons are **attach rate of the sticker and of each garnish, 3D vs 2D fallback**, and average order value. That shows whether the 3D is worth keeping. We also log real-user time to 3D-ready so the speed budget is checked in the field, not just in the lab.

## 7. Milestones

| # | Deliverable | Exit criteria |
|---|---|---|
| **M0: Spike (1–2 days)** | Lathe coconut + name sticker in OGL on a bare page. **In parallel, a physical test:** print sample stickers, put them on chilled, wet coconuts and leave them in the sun for an hour | **Go/no-go on §3 budgets on a real low-end Android.** If OGL misses the byte budget, switch to raw WebGL2 before building anything more. Sticker stock and printer chosen from the physical test (§8). |
| **M1: Builder + 2D preview** | Seed rows + prices (§8), form, `CocoSpec` reducer, URL sync, `drawSticker`, 2D preview on `/build-your-coco` | Works fully with JS 3D disabled; 390 px first |
| **M2: 3D view** | Lazy chunk, cross-fade, drag-to-spin, sticker decal shader, render-on-demand | All §3 numbers met and recorded |
| **M3: Designs + garnish** | 4 designs, 3 fonts, 2 sticker shapes, glyph picker, straw colours, hibiscus/lime/umbrella | Each addition re-measured; chunk still ≤ 30 KB |
| **M4: Share + order** | PNG share, "Add to order" → cart line, server validation, prep-point "Print sticker" | End-to-end: build → order → prep prints a sticker that matches the preview |
| **M5: Hardening** | Context-loss recovery, low-tier device path, a11y (labelled controls, text alternative describing the coconut, keyboard spin with arrow keys), RUM dashboard | Playwright perf test in CI fails the build if the chunk exceeds budget |

M1 already has value on its own (a working, accurate builder), and M2 builds on it. If 3D is ever cut, nothing else has to be redone.

## 8. Decisions (2026-09-26)

1. **Production: printed colour stickers.** Engraving and carving are dropped. The prep point needs a **colour label printer with waterproof/vinyl label stock**. Coconuts come out of the cooler wet with condensation, so the M0 physical test (stick labels on chilled, wet coconuts and leave them in the sun) picks the printer and label stock before we buy in quantity. The prep team wipes the coconut dry, then applies the sticker.
2. **Garnish: prep points will stock it.** Hibiscus, lime and umbrellas are tracked in `inventory` per prep point, and the builder hides anything that's out of stock.
3. **Pricing: extras charged separately.** Starting prices below, to be reviewed after the first few weeks of data:

| Item | Price | Notes |
|---|---|---|
| Classic Coco | US$7 | Unchanged |
| **Custom sticker** (name + optional message, design, font, shape, glyphs) | **+US$2** | Unchanged: keeps the "from US$9" marketing line true. A message needs a name, so the sticker is always paid for. |
| Coloured straw | Free | Pennies per straw; a free choice that gets people started |
| Lime wedge | +US$1 | Already seeded |
| Paper umbrella | +US$1 | New |
| Hibiscus flower | +US$2 | New; it's the most photogenic add-on |
| Extra coconut water | +US$2 | Already seeded |
| Extra straw, spoon | Free | Already seeded |
| **Coco for Two** stickers | +US$2 per coconut | Each coconut can have its own name |

A typical "photo" order: Classic $7 + sticker $2 + hibiscus $2 + umbrella $1 = **US$12** before delivery. Every extra costs cents in materials, which helps with the ~7% card fees on a small order (ARCHITECTURE §26.3).

Seed change: `name` group stays at 200 ¢. Add `umbrella` (100 ¢) and `hibiscus` (200 ¢) options to `extras` and raise its `max_select` to match the new option count. Add the `font`, `shape`, `straw` and `symbol` SELECT groups at 0 ¢.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Procedural husk looks "CG" and cheap | M0 art pass; fallback to one ≤ 40 KB WebP detail texture |
| Preview promises something the prep point can't make | Single `drawSticker` source for preview and print file; colours checked against real printed samples in M0 |
| Stickers peel off wet, cold coconuts | M0 sun-and-condensation test decides the label stock; wipe-dry step in the prep checklist |
| Printer jams or runs out of labels on a busy day | Keep a spare roll at each prep point; if the printer is down, ops pauses sticker orders at that prep point (hide them in the builder, the same way as out-of-stock garnish) |
| Low-end phones overheat or stutter | Render-on-demand, DPR cap, 2D fallback tier, field RUM |
| Offensive names on a branded product | Server blocklist + ops reject path |
| Bundle creep over time | CI size check on the 3D chunk (M5) |

## 10. Build status (2026-09-26)

**Built** on `/build-your-coco`:

| Piece | Where |
|---|---|
| `CocoSpec`, prices, URL encoding, text cleaning, blocklist, `validateSpec` | `lib/coco/spec.ts` |
| Coconut profile and garnish placement shared by both previews | `lib/coco/shape.ts` |
| `drawSticker` (preview, 3D texture, share image) and `renderPrintFile` (300 DPI) | `lib/coco/sticker.ts` |
| Builder form, URL sync, lazy 3D, share | `components/order/CocoBuilder.tsx` |
| 2D preview (SVG coconut + real sticker canvas) | `components/order/Coco2D.tsx` |
| 3D scene (OGL, render on demand) | `components/order/coco3d/scene.ts` |
| Script/Classic sticker fonts, `preload: false` | `components/order/stickerFonts.ts` |
| New seed groups and options with §8 prices | `supabase/seed/jamaica.sql` |

**Measured** on the production build:

| Metric | Budget | Measured |
|---|---|---|
| 3D chunk (gzip) | ≤ 30 KB | **19.2 KB** (OGL + scene + shaders) |
| 3D asset downloads | 0–1 | **0** |
| 3D chunk in initial HTML | none | **none**: loaded on idle after first paint |
| Builder JS added to the page | as small as possible | **~9 KB gzip** (form + 2D preview + sticker drawing) |
| Extra fonts on first load | 0 | **0**: Script/Classic fetched only when picked |
| Page rendering | static | **still prerendered static** |

Frame rate and keystroke-to-frame still need measuring on a real low-end Android phone (§3). That can't be done in CI.

**Not built yet:**
- **"Add to order"** links to `/order?…` with the design in the URL. The cart that reads it is Phase 3.
- **The "Print sticker" button** for the prep point needs the Phase 4 admin. `renderPrintFile(spec, fonts)` is ready for it.
- **Garnish stock:** hiding out-of-stock garnish needs a schema change, because `inventory` is keyed by product SKU and garnish are customisation options.
- **Coco for Two stickers** (a second name, +US$2) need a `name_2` group scoped to the TWO product.
- **Server-side validation** runs when the order API exists; it must call `normalizeSpec` + `validateSpec`.
- **M0 physical sticker test** and the choice of printer.
