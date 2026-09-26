# Build Your Coco: 3D Customiser Plan

Status: **proposal, nothing built yet.** This covers Phase 8 of `docs/ARCHITECTURE.md` §25 ("Build Your Coco: full personalisation + preview") and makes the preview a live, interactive 3D coconut.

The main constraint is **speed**. The customer is a tourist on a beach, on a mid-range phone with weak signal. If the 3D view is slow to load, janky while you type, or drains the battery, it hurts sales more than having no 3D at all. Every decision below follows from that.

---

## 1. What we're copying from the real world

Custom coconuts are already sold at weddings, resorts and brand events ([Coconut Store](https://www.coconutstore.net/custom-coconuts-weddings), [The Bay Coco](https://thebaycoco.com/), [Nauti Coconut](https://www.nauticoconut.com/custom-branded-coconuts/), [Etsy engraved coconuts](https://www.etsy.com/market/coconut_engraved)). The product always looks about the same:

- A **young drinking coconut, trimmed down to the white husk**: flat base, conical top, cut crown, straw.
- Personalisation is **laser-engraved** (brown burn on white husk), **ink-stamped**, or a **printed decal/sticker**.
- Content is a **name, a date, a short message or hashtag**, plus a small motif (hearts, palm, logo).
- Garnish makes the photo: hibiscus flower, lime wedge, paper umbrella, coloured straw.

Our builder should let the customer make exactly that, and see it before they buy.

## 2. What the customer can do

The groups match the existing schema (`supabase/seed/jamaica.sql`), with a few new rows added.

| Control | Input | Shows on the 3D coconut as | Schema |
|---|---|---|---|
| **Name** | text, ≤ 20 | Big engraved text across the front of the husk | `name` (exists, +US$2) |
| **Message** | text, ≤ 40 | Smaller line under the name ("Jamaica 2026") | `message` (exists) |
| **Design** | Jamaican / Tropical / Romance / Birthday | A motif around the text: flag stripes band, palm leaves, hearts, confetti | `design` (exists) |
| **Occasion** | select | Sets default design and message placeholder ("Just Married", date) | `occasion` (exists) |
| **Font** | 3 choices (Bold, Script, Classic) | Text style | **new** `font` SELECT |
| **Finish** | Engraved / Printed | Brown burn vs full-colour print | **new** `finish` SELECT, *only if ops can produce both* (§8) |
| **Straw** | 4 colours | Straw mesh colour | **new** `straw` SELECT |
| **Garnish** | Hibiscus, lime wedge, umbrella | Small 3D props on the crown | extends `extras` |

Interaction:
- **Drag / swipe to spin** the coconut, with inertia; it snaps back to the front when released. No pinch-zoom: it adds nothing on a phone and gets in the way of page scroll.
- **Typing updates the coconut on the next frame.** No "apply" button.
- **"Share my coco"** saves a PNG of the current view for WhatsApp/Instagram. The existing copy says "it's the one that ends up on the grid", so this is the feature that drives word of mouth.
- **"Add to order"** puts a cart line with the chosen customisations into the Phase 3 cart.

Emoji: the example "Jamaica 2026 ❤️" can't be laser-engraved. Hearts, stars and palms become **built-in glyphs** chosen from a picker, and free-text emoji are removed from the input. That keeps the preview honest.

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

### 4.3 Text and designs: one 2D canvas, reused everywhere

This is the most important design choice.

- One function, `drawPrintLayer(ctx, spec)`, draws the name, message, font and motif onto a **2D canvas (1024×512)**. That canvas is the "print area" wrapped around the front of the husk.
- The canvas is uploaded as a texture and mapped with **cylindrical UVs** onto the husk's front band.
- **Engraved look**: the shader darkens the husk to a burn brown where the text alpha is set, and bends the lighting normal using the alpha's gradient (4 neighbouring samples), so the letters look cut into the surface. **Printed look**: the colour is composited directly. Both are the same shader with a uniform switch.
- On each keystroke we redraw the canvas and re-upload the texture, with **at most one upload per animation frame**. At 1024×512 that costs well under a millisecond.
- **The same `drawPrintLayer` also produces:**
  1. the no-WebGL 2D fallback preview,
  2. the share PNG,
  3. the **production file for the prep point** (SVG/PNG to feed the laser engraver or label printer).

  So what the customer sees is exactly what gets made. There's no second rendering path to drift out of sync.

Fonts: reuse the display font the page has already loaded (0 extra bytes). The two extra font choices are **subset to Latin** (~15 KB each), load only when picked, and redraw on `document.fonts.load()`.

### 4.4 Render only when something changes

- **No continuous animation loop.** We draw a frame only when input changes, while a drag is active, or while spin inertia is settling. After that the canvas stays idle, so battery and CPU use drop to nothing.
- Pause entirely when the canvas scrolls off-screen (`IntersectionObserver`) or the tab is hidden.
- Cap `devicePixelRatio` at **2**, or **1.5** on low-memory or low-core devices (`navigator.deviceMemory`, `hardwareConcurrency`). This is the single biggest fill-rate saving on phones.
- `antialias: true` only when DPR ≤ 1.5; above that the extra pixels do the job.

### 4.5 Progressive loading: never a spinner

1. **Server-rendered static preview** (SVG coconut + HTML text overlay, reusing `CocoMark`-style art) paints with the page. Typing into the form updates it straight away.
2. After first paint, `requestIdleCallback` (or the first tap on the preview) triggers a `dynamic import()` of the 3D chunk.
3. The 3D canvas renders its first frame **underneath**, then cross-fades in over the static preview. If loading takes 5 s on bad signal, the customer never notices, because the static preview was already working.
4. **Stay on the 2D preview** when there's no WebGL, `prefers-reduced-motion`, `navigator.connection.saveData`, or a WebGL context loss. It uses the same `drawPrintLayer`, so it's still an accurate preview.

### 4.6 State lives in the form, not in the 3D

- Builder state is a small typed object (`CocoSpec`) held in a reducer and **mirrored into the URL** (`?name=Sarah&design=jamaican…`). Links are shareable, back and refresh work, and the 3D view is a pure function of `CocoSpec`.
- The 3D module exposes only `mount(canvas)`, `update(spec)`, `snapshot()` and `dispose()`, with no React inside it. React never re-renders the canvas.

## 5. Data & ordering integration

- **No migration needed.** All the new controls are `customization_groups` / `customization_options` **seed rows**. Pricing stays server-side through the existing quote flow (`quotes` table, ARCHITECTURE §9). The client price shown is only a display value.
- A `CocoSpec` maps 1:1 to `order_item_customizations` rows (`text_value` for name/message, `option_id` for the rest). `label_snapshot` keeps old orders readable.
- **Server-side validation** (never trust the client): lengths, allowed character set per finish, a profanity/slur blocklist on name and message, and ops can reject an order that slips through.
- **Prep point / runner view** (Phase 4/6 surfaces) shows the spec and a **"Download engraving file"** action that runs the same `drawPrintLayer` to produce the production file.

## 6. Analytics (PostHog, already planned)

`builder_viewed`, `builder_3d_ready` (with load ms and device tier), `builder_field_changed`, `builder_shared`, `builder_added_to_order`. The key comparison is **attach rate of the US$2 personalisation, 3D vs 2D fallback**. That shows whether the 3D is worth keeping. We also log real-user time to 3D-ready so the speed budget is checked in the field, not just in the lab.

## 7. Milestones

| # | Deliverable | Exit criteria |
|---|---|---|
| **M0: Spike (1–2 days)** | Lathe coconut + engraved name in OGL on a bare page | **Go/no-go on §3 budgets on a real low-end Android.** If OGL misses the byte budget, switch to raw WebGL2 before building anything more. |
| **M1: Builder + 2D preview** | Form, `CocoSpec` reducer, URL sync, `drawPrintLayer`, 2D preview on `/build-your-coco` | Works fully with JS 3D disabled; 390 px first |
| **M2: 3D view** | Lazy chunk, cross-fade, drag-to-spin, engraved/printed shader, render-on-demand | All §3 numbers met and recorded |
| **M3: Designs + garnish** | 4 motifs, 3 fonts, straw colours, hibiscus/lime/umbrella | Each addition re-measured; chunk still ≤ 30 KB |
| **M4: Share + order** | PNG share, "Add to order" → cart line, server validation, prep-point production file | End-to-end: build → order → prep sees the correct file |
| **M5: Hardening** | Context-loss recovery, low-tier device path, a11y (labelled controls, text alternative describing the coconut, keyboard spin with arrow keys), RUM dashboard | Playwright perf test in CI fails the build if the chunk exceeds budget |

M1 already has value on its own (a working, accurate builder), and M2 builds on it. If 3D is ever cut, nothing else has to be redone.

## 8. Decisions needed from you

1. **What can we physically produce at launch?** (ARCHITECTURE §27.8, still open.) Laser-engraved means a small desktop laser at the prep point: fast, and it looks premium. Printed means a sticker/label printer: cheaper, full colour. The preview must only offer what the runner can actually hand over, so the answer decides whether "Finish" is a choice or a fixed value.
2. **Garnish availability.** Hibiscus and umbrellas need stock at each prep point. Offer them only where inventory says yes (the same rule as the existing "only what we can put in your hand" copy).
3. **Price of extras** (font, garnish), or keep everything in the single US$2 personalisation fee. Simpler is probably better on a beach.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Procedural husk looks "CG" and cheap | M0 art pass; fallback to one ≤ 40 KB WebP detail texture |
| Preview promises something the prep point can't make | Single `drawPrintLayer` source for preview and production; finish options tied to decision §8.1 |
| Low-end phones overheat or stutter | Render-on-demand, DPR cap, 2D fallback tier, field RUM |
| Offensive names on a branded product | Server blocklist + ops reject path |
| Bundle creep over time | CI size check on the 3D chunk (M5) |
