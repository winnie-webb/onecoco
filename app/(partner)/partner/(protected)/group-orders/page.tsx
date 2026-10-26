import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { getActiveProducts } from "@/lib/db/queries/catalogue";
import { GroupOrderForm } from "@/components/partner/GroupOrderForm";

export const metadata: Metadata = { title: "Group orders" };
export const dynamic = "force-dynamic";

function money(cents: number, currency = "USD"): string {
  return `${currency === "USD" ? "US$" : currency + " "}${(cents / 100).toFixed(2)}`;
}

export default async function Page() {
  const db = await serverClient();
  const products = await getActiveProducts();

  const { data: scheduled, error } = await db
    .from("orders")
    .select("id, order_number, fulfillment_status, payment_status, total_cents, currency, scheduled_for")
    .not("scheduled_for", "is", null)
    .order("scheduled_for", { ascending: true });
  if (error) throw new Error(error.message);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Group orders</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Pre-order for a group at a scheduled time — a tour arriving at 11:30, say. Billed cash-on-delivery for now.
      </p>

      <GroupOrderForm products={products} />

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-ink-soft">Your requests</h2>
      <div className="mt-3 overflow-x-auto rounded-card border-2 border-sand-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Scheduled for</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(scheduled ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                  No group orders yet.
                </td>
              </tr>
            )}
            {(scheduled ?? []).map((o) => (
              <tr key={o.id} className="border-t border-sand-200">
                <td className="px-4 py-3 font-semibold">#{o.order_number}</td>
                <td className="px-4 py-3">{o.scheduled_for ? new Date(o.scheduled_for).toLocaleString() : "—"}</td>
                <td className="px-4 py-3">{o.fulfillment_status}</td>
                <td className="px-4 py-3">{money(o.total_cents, o.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
