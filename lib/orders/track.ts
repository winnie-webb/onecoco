import crypto from "node:crypto";
import { serviceClient } from "@/lib/db/client";
import type { FulfillmentStatus } from "@/lib/orders/state";

export interface TrackPayload {
  orderNumber: number;
  fulfillmentStatus: FulfillmentStatus;
  deliveryCode: string;
  placedAt: string;
  promisedEtaMinMinutes: number | null;
  promisedEtaMaxMinutes: number | null;
  landmarkText: string | null;
  customerDescription: string | null;
  arrivingAnnounced: boolean;
  runnerName: string | null;
  deliveredAt: string | null;
  cancelledReason: string | null;
  canReportMoved: boolean;
  totalCents: number;
  currency: string;
  cashDue: boolean;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const NON_TERMINAL: FulfillmentStatus[] = ["PLACED", "AWAITING_RUNNER", "ASSIGNED", "OUT_FOR_DELIVERY"];

/**
 * §10: guest tracking is by hashed token only, never `order_number`. Returns
 * null for "not found, expired, or malformed" alike — the route above
 * responds identically for all three (§10: "identical response shape for
 * invalid tokens").
 */
export async function getTrackPayload(token: string): Promise<TrackPayload | null> {
  const hash = hashToken(token);
  const db = serviceClient();

  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, order_number, fulfillment_status, payment_status, delivery_code, placed_at, promised_eta_min_at, promised_eta_max_at, landmark_text, customer_description, arriving_announced_at, delivered_at, cancellation_reason, track_expires_at, total_cents, currency",
    )
    .eq("track_token_hash", hash)
    .maybeSingle();
  if (error || !order) return null;

  if (order.track_expires_at && new Date(order.track_expires_at) <= new Date()) return null;

  let runnerName: string | null = null;
  const { data: assignment } = await db
    .from("order_assignments")
    .select("runners(name)")
    .eq("order_id", order.id)
    .is("released_at", null)
    .maybeSingle();
  if (assignment) {
    runnerName = (assignment as unknown as { runners: { name: string } | null }).runners?.name ?? null;
  }

  const minutesUntil = (iso: string | null): number | null => {
    if (!iso) return null;
    return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  };

  return {
    orderNumber: order.order_number,
    fulfillmentStatus: order.fulfillment_status,
    deliveryCode: order.delivery_code,
    placedAt: order.placed_at,
    promisedEtaMinMinutes: minutesUntil(order.promised_eta_min_at),
    promisedEtaMaxMinutes: minutesUntil(order.promised_eta_max_at),
    landmarkText: order.landmark_text,
    customerDescription: order.customer_description,
    arrivingAnnounced: order.arriving_announced_at != null,
    runnerName,
    deliveredAt: order.delivered_at,
    cancelledReason: order.cancellation_reason,
    canReportMoved: NON_TERMINAL.includes(order.fulfillment_status),
    totalCents: order.total_cents,
    currency: order.currency,
    cashDue: order.payment_status === "CASH_DUE",
  };
}

export async function recordCustomerMoved(token: string, lat: number, lng: number, accuracyM?: number): Promise<boolean> {
  const hash = hashToken(token);
  const db = serviceClient();

  const { data: order } = await db
    .from("orders")
    .select("id, fulfillment_status")
    .eq("track_token_hash", hash)
    .maybeSingle();
  if (!order || !NON_TERMINAL.includes(order.fulfillment_status)) return false;

  const { error } = await db.from("order_locations").insert({
    order_id: order.id,
    point: `POINT(${lng} ${lat})`,
    accuracy_m: accuracyM ?? null,
    source: "CUSTOMER_MOVED",
  });
  return !error;
}
