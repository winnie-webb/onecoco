import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { ProductsTable, type ProductRow } from "@/components/admin/ProductsTable";

export const metadata: Metadata = { title: "Products · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await serverClient();
  const { data, error } = await db.from("products").select("id, sku, name, base_price_cents, currency, active").order("sort_order");
  if (error) throw new Error(error.message);

  const products: ProductRow[] = (data ?? []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    basePriceCents: p.base_price_cents,
    currency: p.currency,
    active: p.active,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Products</h1>
      <p className="mt-1 text-sm text-ink-soft">Every price on the site reads from here — never a code literal.</p>
      <ProductsTable products={products} />
    </div>
  );
}
