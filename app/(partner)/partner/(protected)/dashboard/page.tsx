import type { Metadata } from "next";
import { requirePartnerSession } from "@/lib/auth/partner-guards";
import { serverClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function money(cents: number, currency = "USD"): string {
  return `${currency === "USD" ? "US$" : currency + " "}${(cents / 100).toFixed(2)}`;
}

export default async function Page() {
  const session = await requirePartnerSession();
  const db = await serverClient();

  // partner_attributed_orders (0018_partner_rls.sql) scopes this to
  // exactly this partner's orders — no partner_id filter needed here, RLS
  // already is the filter (§16).
  const { data: orders, error } = await db
    .from("orders")
    .select("id, order_number, fulfillment_status, payment_status, total_cents, currency, placed_at")
    .order("placed_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const rows = orders ?? [];
  const paidRows = rows.filter((o) => ["CAPTURED", "CASH_COLLECTED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(o.payment_status));
  const totalRevenueCents = paidRows.reduce((sum, o) => sum + o.total_cents, 0);
  const commissionCents = Math.round((totalRevenueCents * session.commissionRateBps) / 10_000);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">{session.partnerName}</h1>
      <p className="mt-1 text-sm text-ink-soft">Orders attributed to your QR codes and referral link.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border-2 border-sand-200 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">Attributed orders</p>
          <p className="mt-1 text-3xl font-bold text-jungle-900">{rows.length}</p>
        </div>
        <div className="rounded-card border-2 border-sand-200 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">Revenue (paid orders)</p>
          <p className="mt-1 text-3xl font-bold text-jungle-900">{money(totalRevenueCents)}</p>
        </div>
        <div className="rounded-card border-2 border-lime-500 bg-lime-500/10 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">
            Commission ({(session.commissionRateBps / 100).toFixed(2)}%)
          </p>
          <p className="mt-1 text-3xl font-bold text-jungle-900">{money(commissionCents)}</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-card border-2 border-sand-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                  No orders attributed yet.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-sand-200">
                <td className="px-4 py-3 font-semibold">#{o.order_number}</td>
                <td className="px-4 py-3">{o.fulfillment_status}</td>
                <td className="px-4 py-3">{o.payment_status}</td>
                <td className="px-4 py-3">{money(o.total_cents, o.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
