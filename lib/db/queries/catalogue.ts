import { anonClient } from "@/lib/db/client";

/**
 * The real catalogue, read from Postgres. `lib/marketing-menu.ts` stays
 * display-only copy for the landing page (Phase 1 note) — nothing in an
 * ordering path may import it. This is the Phase 2 replacement: no price is
 * ever a literal in code (README convention).
 *
 * Uses the anon client — `public_read_products` / `public_read_availability`
 * (0007_rls.sql) already scope this to active rows, and it's the same data
 * the marketing pages publish, so a Server Component can call it directly.
 */
export interface CatalogueProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  basePriceCents: number;
  currency: string;
  sortOrder: number;
}

export async function getActiveProducts(): Promise<CatalogueProduct[]> {
  const { data, error } = await anonClient()
    .from("products")
    .select("id, sku, name, slug, description, image, base_price_cents, currency, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`catalogue read failed: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    description: p.description,
    image: p.image,
    basePriceCents: p.base_price_cents,
    currency: p.currency,
    sortOrder: p.sort_order,
  }));
}
