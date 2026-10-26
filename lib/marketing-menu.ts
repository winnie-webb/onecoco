/**
 * PHASE 1 PLACEHOLDER — display copy only.
 *
 * These are marketing figures for the landing page, not a pricing source.
 * In Phase 2 the real catalogue lands in Postgres (`products` +
 * `product_availability`) and every price on this site is read from there.
 * Nothing may import these values into an ordering or checkout path.
 */
export const menuPreview = [
  {
    slug: "classic-coco",
    name: "Classic Coco",
    priceLabel: "US$7",
    blurb: "One fresh Jamaican coconut, opened cold and handed to you with a straw.",
    includes: ["Fresh coconut", "Opened on the spot", "Straw"],
    featured: true,
  },
  {
    slug: "coco-for-two",
    name: "Coco for Two",
    priceLabel: "US$12",
    blurb: "Two coconuts, two straws. Cheaper than two, for obvious reasons.",
    includes: ["Two fresh coconuts", "Opened on the spot", "Two straws"],
    featured: false,
  },
] as const;
