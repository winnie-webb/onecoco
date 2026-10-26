import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { ProductsTable, type ProductRow } from "@/components/admin/ProductsTable";
import { StockTable, type StockRow } from "@/components/admin/StockTable";

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

  // Stock is counted in coconuts on each prep point's CLASSIC row
  // (migration 0022); Coco for Two draws 2 from the same count.
  const { data: stockData, error: stockError } = await db
    .from("inventory")
    .select("id, qty_available, prep_points(name, beaches(name))")
    .eq("sku", "CLASSIC");
  if (stockError) throw new Error(stockError.message);

  const stock: StockRow[] = (stockData ?? []).map((r) => {
    const prep = r.prep_points as unknown as { name: string; beaches: { name: string } | null } | null;
    return { id: r.id, beachName: prep?.beaches?.name ?? "—", prepPointName: prep?.name ?? "—", qtyAvailable: r.qty_available };
  });
  stock.sort((a, b) => a.beachName.localeCompare(b.beachName));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Coconuts in stock</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Each order takes from this count (Coco for Two takes 2). At 0 the beach stops taking orders.
      </p>
      <StockTable rows={stock} />

      <div className="mt-10" />
      <h2 className="font-display text-2xl font-bold text-jungle-900">Products</h2>
      <p className="mt-1 text-sm text-ink-soft">Every price on the site reads from here — never a code literal.</p>
      <ProductsTable products={products} />
    </div>
  );
}
