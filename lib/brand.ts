/**
 * THE ONLY PLACE THE BRAND NAME APPEARS.
 *
 * The name is not final (Phase 0, §27.6). Nothing else in this codebase may
 * contain the literal brand name — not page copy, not metadata, not the
 * footer, not the OG image. If you are about to type it somewhere else,
 * import it from here instead.
 *
 * A rename should touch this file, the <Wordmark/> artwork, and nothing else.
 */

export const brand = {
  /** Full name, as used in prose and metadata. */
  name: "One Coco",
  /** Short form for tight spaces (nav, mobile bar). */
  short: "One Coco",
  /** Possessive form — English irregulars make this worth storing. */
  possessive: "One Coco's",

  tagline: "Your Coco. Right to you.",
  subtitle:
    "Fresh Jamaican coconuts, opened cold and delivered straight to your beach location.",

  /** Primary call to action. Used verbatim in several places. */
  cta: "Get a Coco",

  /** Launch market. Displayed under the hero and in metadata. */
  market: "Montego Bay, Jamaica",
  marketShort: "Montego Bay",

  contact: {
    email: "hello@example.com",
    whatsapp: "",
    instagram: "",
  },
} as const;

/**
 * Canonical origin. Env var from day one so the domain decision stays
 * deployment config rather than source — the domain is still open (§27.7).
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type Brand = typeof brand;
