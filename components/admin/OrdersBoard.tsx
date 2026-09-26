"use client";

import { useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/db/browser";
import { FULFILLMENT_COPY } from "@/lib/orders/copy";
import type { AdminOrderRow, AtRiskRow } from "@/lib/db/queries/admin-orders";

const RISK_COPY: Record<string, string> = {
  ACCEPT_WINDOW_BLOWN: "Past its accept window — no runner took it in time",
  STUCK_AT_ASSIGNED: "Assigned 15+ min ago, never picked up",
  RUNNER_SIGNAL_STALE: "Runner has no recent heartbeat",
  RUNNING_LATE: "Past the promised ETA",
};

const AT_RISK_POLL_MS = 15_000;

function money(cents: number, currency: string): string {
  return `${currency === "USD" ? "US$" : currency + " "}${(cents / 100).toFixed(2)}`;
}

/** §15: "Live order board (Realtime) with an at_risk view → intervene on
 * stuck orders." Realtime for the order list itself (this is the one
 * authenticated-staff surface §3 reserves it for); the at_risk view is
 * inherently time-based (device_last_seen_at vs. now()), so it's polled
 * rather than pushed — nothing writes to `orders` at the instant a heartbeat
 * goes stale, so there's no row-change event to subscribe to for that. */
export function OrdersBoard({ initialOrders, initialAtRisk }: { initialOrders: AdminOrderRow[]; initialAtRisk: AtRiskRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [atRisk, setAtRisk] = useState(initialAtRisk);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const atRiskById = useMemo(() => new Map(atRisk.map((r) => [r.orderId, r.riskReason])), [atRisk]);

  useEffect(() => {
    const supabase = browserClient();
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => {
          const row = payload.new as Record<string, unknown> | undefined;
          if (!row?.id) return prev;

          const ACTIVE = ["PLACED", "AWAITING_RUNNER", "ASSIGNED", "OUT_FOR_DELIVERY"];
          if (!ACTIVE.includes(row.fulfillment_status as string)) {
            return prev.filter((o) => o.id !== row.id);
          }

          const updated: AdminOrderRow = {
            id: row.id as string,
            orderNumber: row.order_number as number,
            fulfillmentStatus: row.fulfillment_status as AdminOrderRow["fulfillmentStatus"],
            paymentStatus: row.payment_status as AdminOrderRow["paymentStatus"],
            contactName: (row.contact_name as string) ?? null,
            totalCents: row.total_cents as number,
            currency: row.currency as string,
            placedAt: row.placed_at as string,
            beachName: prev.find((o) => o.id === row.id)?.beachName ?? null,
            zoneName: prev.find((o) => o.id === row.id)?.zoneName ?? null,
          };

          const exists = prev.some((o) => o.id === row.id);
          return exists ? prev.map((o) => (o.id === row.id ? updated : o)) : [updated, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const supabase = browserClient();
    let cancelled = false;

    async function pollAtRisk() {
      const { data } = await supabase.from("orders_at_risk").select("order_id, order_number, risk_reason");
      if (cancelled) return;
      setAtRisk(
        (data ?? [])
          .filter((r) => r.risk_reason)
          .map((r) => ({ orderId: r.order_id as string, orderNumber: r.order_number as number, riskReason: r.risk_reason as string })),
      );
    }

    const interval = setInterval(pollAtRisk, AT_RISK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function cancelOrder(id: string) {
    const reason = window.prompt("Cancellation reason?");
    if (!reason) return;
    setCancelling(id);
    try {
      const res = await fetch(`/api/v1/admin/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Could not cancel.");
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Live orders</h1>

      {atRisk.length > 0 && (
        <div className="mt-4 rounded-card border-2 border-red-300 bg-red-50 p-4">
          <p className="font-bold text-red-800">{atRisk.length} at risk</p>
          <ul className="mt-2 space-y-1 text-sm text-red-800">
            {atRisk.map((r) => (
              <li key={r.orderId}>
                #{r.orderNumber} — {RISK_COPY[r.riskReason] ?? r.riskReason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Below md: one card per order — seven columns of a live board don't
          fit a phone screen without sideways scrolling through the exact
          data an ops person is trying to act on quickly. */}
      <div className="mt-6 space-y-3 md:hidden">
        {orders.length === 0 && (
          <p className="rounded-card border-2 border-sand-200 px-4 py-8 text-center text-ink-soft">No active orders.</p>
        )}
        {orders.map((o) => (
          <div
            key={o.id}
            className={`rounded-card border-2 p-4 ${atRiskById.has(o.id) ? "border-red-300 bg-red-50" : "border-sand-200"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">#{o.orderNumber}</span>
              <span className="font-semibold">{money(o.totalCents, o.currency)}</span>
            </div>
            <p className="mt-1 text-sm">
              {FULFILLMENT_COPY[o.fulfillmentStatus]} · {o.paymentStatus}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {o.contactName ?? "—"} · {o.zoneName ?? "—"}
            </p>
            <button
              onClick={() => cancelOrder(o.id)}
              disabled={cancelling === o.id}
              className="mt-3 min-h-11 w-full rounded-full border border-red-300 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Cancel
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-card border-2 border-sand-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                  No active orders.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className={`border-t border-sand-200 ${atRiskById.has(o.id) ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3 font-semibold">#{o.orderNumber}</td>
                <td className="px-4 py-3">{FULFILLMENT_COPY[o.fulfillmentStatus]}</td>
                <td className="px-4 py-3">{o.paymentStatus}</td>
                <td className="px-4 py-3">{o.contactName ?? "—"}</td>
                <td className="px-4 py-3">{o.zoneName ?? "—"}</td>
                <td className="px-4 py-3">{money(o.totalCents, o.currency)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => cancelOrder(o.id)}
                    disabled={cancelling === o.id}
                    className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
