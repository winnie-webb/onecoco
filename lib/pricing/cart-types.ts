/**
 * Shared cart shape between client components and `lib/pricing/quote.ts`.
 * Deliberately its own file with zero imports — `quote.ts` pulls in
 * `serviceClient` (service-role key) and must never end up in a browser
 * bundle; a client component importing types FROM quote.ts would drag that
 * whole module graph along even for a type-only import in some bundler
 * configurations, so the types live here instead.
 */

export interface CartSelection {
  groupKey: string;
  optionValues?: string[]; // SELECT / MULTISELECT
  textValue?: string; // TEXT
  boolValue?: boolean; // BOOLEAN
}

export interface CartItem {
  productId: string;
  qty: number;
  selections: CartSelection[];
}
