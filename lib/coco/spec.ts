/**
 * Build Your Coco — the one description of a customised coconut.
 *
 * `CocoSpec` is what the form edits, what the URL carries, what the 2D and 3D
 * previews draw, and (Phase 3) what becomes `order_item_customizations` rows.
 * Keys and prices mirror `supabase/seed/jamaica.sql`; the server re-prices
 * from the database at quote time, so the numbers here are display-only.
 *
 * Plain TypeScript, no DOM: safe to import from Server Components and from the
 * future order API for validation.
 */

export const BASE_PRICE_CENTS = 700;
export const STICKER_PRICE_CENTS = 200;

export const NAME_MAX = 20;
export const MESSAGE_MAX = 40;

export const designs = [
  { value: "jamaican", label: "Jamaican" },
  { value: "tropical", label: "Tropical" },
  { value: "romance", label: "Romance" },
  { value: "birthday", label: "Birthday" },
] as const;

export const occasions = [
  { value: "vacation", label: "Vacation", design: "tropical", placeholder: "Jamaica 2026" },
  { value: "birthday", label: "Birthday", design: "birthday", placeholder: "Happy birthday!" },
  { value: "honeymoon", label: "Honeymoon", design: "romance", placeholder: "Just the two of us" },
  { value: "anniversary", label: "Anniversary", design: "romance", placeholder: "10 years & counting" },
  { value: "just-married", label: "Just Married", design: "romance", placeholder: "Mr & Mrs" },
] as const;

export const fonts = [
  { value: "bold", label: "Bold" },
  { value: "script", label: "Script" },
  { value: "classic", label: "Classic" },
] as const;

export const shapes = [
  { value: "round", label: "Round", widthIn: 2, heightIn: 2 },
  { value: "oval", label: "Oval", widthIn: 2, heightIn: 2.5 },
] as const;

export const straws = [
  { value: "lime", label: "Lime", color: "#b9e04c" },
  { value: "pink", label: "Pink", color: "#f472b6" },
  { value: "yellow", label: "Yellow", color: "#fed100" },
  { value: "blue", label: "Blue", color: "#38bdf8" },
] as const;

/** Symbols from our own glyph set. Typed emoji are stripped (see §2 of the plan). */
export const symbols = [
  { value: "none", label: "None" },
  { value: "heart", label: "Heart" },
  { value: "star", label: "Star" },
  { value: "palm", label: "Palm" },
  { value: "sun", label: "Sun" },
  { value: "flower", label: "Flower" },
] as const;

export const extras = [
  { value: "hibiscus", label: "Hibiscus flower", priceCents: 200, garnish: true },
  { value: "umbrella", label: "Paper umbrella", priceCents: 100, garnish: true },
  { value: "lime", label: "Lime wedge", priceCents: 100, garnish: true },
  { value: "water", label: "Extra coconut water", priceCents: 200, garnish: false },
  { value: "straw", label: "Extra straw", priceCents: 0, garnish: false },
  { value: "spoon", label: "Spoon", priceCents: 0, garnish: false },
] as const;

type Values<T extends readonly { value: string }[]> = T[number]["value"];

export type Design = Values<typeof designs>;
export type Occasion = Values<typeof occasions>;
export type Font = Values<typeof fonts>;
export type Shape = Values<typeof shapes>;
export type Straw = Values<typeof straws>;
export type SymbolKey = Values<typeof symbols>;
export type Extra = Values<typeof extras>;

export type CocoSpec = {
  name: string;
  message: string;
  design: Design;
  occasion: Occasion | "";
  font: Font;
  shape: Shape;
  straw: Straw;
  symbol: SymbolKey;
  extras: Extra[];
};

export const defaultSpec: CocoSpec = {
  name: "",
  message: "",
  design: "jamaican",
  occasion: "",
  font: "bold",
  shape: "round",
  straw: "lime",
  symbol: "none",
  extras: [],
};

const has = <T extends readonly { value: string }[]>(list: T, v: unknown): v is Values<T> =>
  typeof v === "string" && list.some((o) => o.value === v);

/**
 * Characters the sticker fonts can draw. Latin + Latin-1/Extended-A covers the
 * names tourists actually type (José, Zoë, Siobhán); everything else —
 * including emoji — is dropped rather than printed as tofu boxes.
 */
const DISALLOWED = /[^A-Za-z0-9À-ſ .,'’!?&@#+:/()-]/g;

export function cleanText(raw: string, max: number): string {
  return raw.replace(DISALLOWED, "").replace(/\s{2,}/g, " ").slice(0, max);
}

/*
 * A deliberately short blocklist. It catches the obvious cases before a
 * sticker is printed with a brand next to it; the prep team rejecting an
 * order is the real backstop. Matched on whole words after undoing common
 * letter swaps, so "Scunthorpe" and "Sussex" still print.
 */
const BLOCKED = [
  "fuck", "fucker", "fucking", "shit", "bitch", "cunt", "dick", "cock", "pussy",
  "whore", "slut", "bastard", "asshole", "nigger", "nigga", "faggot", "fag",
  "retard", "rape", "nazi", "kkk",
  // Jamaican patois
  "bumbo", "bumboclaat", "bloodclaat", "bomboclaat", "rassclaat", "rasclaat",
  "pussyclaat", "batty", "battyman", "chi chi man",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

export function isBlocked(text: string): boolean {
  const norm = text
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z ]/g, " ");
  const padded = ` ${norm.replace(/\s+/g, " ")} `;
  const squashed = norm.replace(/ /g, "");
  return BLOCKED.some((w) => {
    if (padded.includes(` ${w} `)) return true;
    // Long words are distinctive enough to catch when spaced out ("b u m b o").
    const bare = w.replace(/ /g, "");
    return bare.length >= 6 && squashed.includes(bare);
  });
}

/** Coerce anything (URL params, a request body) into a valid spec. */
export function normalizeSpec(input: Partial<Record<keyof CocoSpec, unknown>>): CocoSpec {
  const extrasIn = Array.isArray(input.extras) ? input.extras : [];
  return {
    name: typeof input.name === "string" ? cleanText(input.name, NAME_MAX) : "",
    message: typeof input.message === "string" ? cleanText(input.message, MESSAGE_MAX) : "",
    design: has(designs, input.design) ? input.design : defaultSpec.design,
    occasion: has(occasions, input.occasion) ? input.occasion : "",
    font: has(fonts, input.font) ? input.font : defaultSpec.font,
    shape: has(shapes, input.shape) ? input.shape : defaultSpec.shape,
    straw: has(straws, input.straw) ? input.straw : defaultSpec.straw,
    symbol: has(symbols, input.symbol) ? input.symbol : defaultSpec.symbol,
    extras: extras.map((e) => e.value).filter((v) => extrasIn.includes(v)),
  };
}

export type SpecProblem = { field: "name" | "message"; message: string };

/** Rules the order API must also enforce — never trust the client. */
export function validateSpec(spec: CocoSpec): SpecProblem[] {
  const problems: SpecProblem[] = [];
  if (isBlocked(spec.name)) problems.push({ field: "name", message: "Let's keep it friendly." });
  if (isBlocked(spec.message)) problems.push({ field: "message", message: "Let's keep it friendly." });
  if (spec.message.trim() && !spec.name.trim())
    problems.push({ field: "name", message: "Add a name to go with your message." });
  return problems;
}

export const hasSticker = (spec: CocoSpec) => spec.name.trim().length > 0;

export type PriceLine = { label: string; cents: number };

export function priceLines(spec: CocoSpec): PriceLine[] {
  const lines: PriceLine[] = [{ label: "Classic Coco", cents: BASE_PRICE_CENTS }];
  if (hasSticker(spec)) lines.push({ label: "Custom sticker", cents: STICKER_PRICE_CENTS });
  for (const e of extras) {
    if (spec.extras.includes(e.value)) lines.push({ label: e.label, cents: e.priceCents });
  }
  return lines;
}

export const formatUsd = (cents: number) =>
  cents === 0 ? "Free" : `US$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/* ---------- URL <-> spec. Short keys keep shared links readable. ---------- */

const KEYS: Record<Exclude<keyof CocoSpec, "extras">, string> = {
  name: "n",
  message: "m",
  design: "d",
  occasion: "o",
  font: "f",
  shape: "sh",
  straw: "st",
  symbol: "sy",
};

export function specToParams(spec: CocoSpec): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, short] of Object.entries(KEYS) as [keyof typeof KEYS, string][]) {
    if (spec[k] !== defaultSpec[k]) p.set(short, spec[k]);
  }
  if (spec.extras.length) p.set("x", spec.extras.join(","));
  return p;
}

export function specFromParams(p: URLSearchParams): CocoSpec {
  const raw: Partial<Record<keyof CocoSpec, unknown>> = {};
  for (const [k, short] of Object.entries(KEYS) as [keyof typeof KEYS, string][]) {
    const v = p.get(short);
    if (v !== null) raw[k] = v;
  }
  raw.extras = (p.get("x") ?? "").split(",").filter(Boolean);
  return normalizeSpec(raw);
}
