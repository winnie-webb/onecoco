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

export interface CustomizationOption {
  value: string;
  label: string;
  priceDeltaCents: number;
}

export interface CustomizationGroup {
  key: string;
  label: string;
  inputType: "TEXT" | "SELECT" | "MULTISELECT" | "BOOLEAN";
  required: boolean;
  maxLength: number | null;
  minSelect: number;
  maxSelect: number;
  priceDeltaCents: number;
  sortOrder: number;
  options: CustomizationOption[];
}

export interface CatalogueProductWithCustomizations extends CatalogueProduct {
  customizationGroups: CustomizationGroup[];
}

/** Full picker data: products plus their customization groups and options,
 * exactly what `ProductPicker` needs to build a `CartItem` (lib/pricing/quote.ts)
 * without a second round trip. Anon client — same public RLS as the plain
 * product read. */
export async function getFullCatalogue(): Promise<CatalogueProductWithCustomizations[]> {
  const db = anonClient();

  const products = await getActiveProducts();

  const { data: links, error: linksError } = await db
    .from("product_customization_groups")
    .select(
      "product_id, required, sort_order, customization_groups(key, label, input_type, required, max_length, min_select, max_select, price_delta_cents, sort_order, id)",
    );
  if (linksError) throw new Error(`customization group read failed: ${linksError.message}`);

  const { data: options, error: optionsError } = await db
    .from("customization_options")
    .select("group_id, value, label, price_delta_cents")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (optionsError) throw new Error(`customization option read failed: ${optionsError.message}`);

  return products.map((product) => {
    const groups = (links ?? [])
      .filter((l) => l.product_id === product.id)
      .map((l) => {
        const g = l.customization_groups as unknown as {
          id: string;
          key: string;
          label: string;
          input_type: CustomizationGroup["inputType"];
          required: boolean;
          max_length: number | null;
          min_select: number;
          max_select: number;
          price_delta_cents: number;
          sort_order: number;
        };
        return {
          key: g.key,
          label: g.label,
          inputType: g.input_type,
          required: l.required || g.required,
          maxLength: g.max_length,
          minSelect: g.min_select,
          maxSelect: g.max_select,
          priceDeltaCents: g.price_delta_cents,
          sortOrder: l.sort_order,
          options: (options ?? [])
            .filter((o) => o.group_id === g.id)
            .map((o) => ({ value: o.value, label: o.label, priceDeltaCents: o.price_delta_cents })),
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return { ...product, customizationGroups: groups };
  });
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
