import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export interface AdminOrderRow {
  id: string;
  orderNumber: number;
  fulfillmentStatus: Database["public"]["Enums"]["fulfillment_status"];
  paymentStatus: Database["public"]["Enums"]["payment_status"];
  contactName: string | null;
  totalCents: number;
  currency: string;
  placedAt: string;
  beachName: string | null;
  zoneName: string | null;
}

const ACTIVE_STATUSES = ["PLACED", "AWAITING_RUNNER", "ASSIGNED", "OUT_FOR_DELIVERY"] as const;

/** The board's main list — active orders only, newest first. Delivered /
 * cancelled / expired orders are history, not something ops needs staring
 * at (a later phase can add a filtered "history" view on the same query). */
export async function getActiveOrders(db: SupabaseClient<Database>): Promise<AdminOrderRow[]> {
  const { data, error } = await db
    .from("orders")
    .select("id, order_number, fulfillment_status, payment_status, contact_name, total_cents, currency, placed_at, beaches(name), delivery_zones(name)")
    .in("fulfillment_status", ACTIVE_STATUSES)
    .order("placed_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`admin orders read failed: ${error.message}`);

  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    fulfillmentStatus: o.fulfillment_status,
    paymentStatus: o.payment_status,
    contactName: o.contact_name,
    totalCents: o.total_cents,
    currency: o.currency,
    placedAt: o.placed_at,
    beachName: (o.beaches as unknown as { name: string } | null)?.name ?? null,
    zoneName: (o.delivery_zones as unknown as { name: string } | null)?.name ?? null,
  }));
}

export interface AtRiskRow {
  orderId: string;
  orderNumber: number;
  riskReason: string;
}

export async function getAtRiskOrders(db: SupabaseClient<Database>): Promise<AtRiskRow[]> {
  const { data, error } = await db.from("orders_at_risk").select("order_id, order_number, risk_reason");
  if (error) throw new Error(`at-risk read failed: ${error.message}`);
  return (data ?? [])
    .filter((r) => r.risk_reason)
    .map((r) => ({ orderId: r.order_id as string, orderNumber: r.order_number as number, riskReason: r.risk_reason as string }));
}
