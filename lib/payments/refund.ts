import { serviceClient } from "@/lib/db/client";
import type { Json } from "@/lib/db/types";
import { getProvider } from "@/lib/payments";
import { assertPaymentTransition } from "@/lib/orders/state";
import { alert } from "@/lib/monitoring/alert";

export type RefundResult =
  | { status: "REFUNDED"; amountCents: number }
  | { status: "NOTHING_TO_REFUND" }
  | { status: "FAILED"; reason: string };

/**
 * Full refund of whatever was captured on an order. Shared by ops cancel
 * (§5) and the expiry sweep (T-4), so both record money the same way.
 *
 * A failed refund is never swallowed (audit T-12): it is written to
 * `refunds` with status FAILED and to `audit_log`, and returned to the
 * caller so the admin UI / sweep response can say so. The order keeps
 * `payment_status = CAPTURED` in that case — which is the truth — and ops
 * retries from the PayPal dashboard.
 */
export async function refundOrderInFull(orderId: string, reason: string, actorUserId: string | null): Promise<RefundResult> {
  const db = serviceClient();

  const { data: order } = await db
    .from("orders")
    .select("id, payment_status, amount_captured_cents, amount_refunded_cents, currency")
    .eq("id", orderId)
    .single();
  if (!order || order.payment_status !== "CAPTURED") return { status: "NOTHING_TO_REFUND" };

  const amountCents = order.amount_captured_cents - order.amount_refunded_cents;
  if (amountCents <= 0) return { status: "NOTHING_TO_REFUND" };

  const { data: payment } = await db
    .from("payments")
    .select("id, provider, provider_capture_id")
    .eq("order_id", orderId)
    .eq("status", "CAPTURED")
    .maybeSingle();
  if (!payment?.provider_capture_id) {
    return recordFailure(orderId, null, amountCents, reason, actorUserId, "no captured payment with a capture id");
  }

  let outcome;
  try {
    const provider = await getProvider(payment.provider);
    outcome = await provider.refund({
      providerCaptureId: payment.provider_capture_id,
      amountCents,
      currency: order.currency,
      reason,
    });
  } catch (err) {
    return recordFailure(orderId, payment.id, amountCents, reason, actorUserId, err instanceof Error ? err.message : String(err));
  }

  if (outcome.status === "FAILED") {
    return recordFailure(orderId, payment.id, amountCents, reason, actorUserId, outcome.reason, outcome.raw);
  }

  await db.from("refunds").insert({
    payment_id: payment.id,
    provider_refund_id: outcome.providerRefundId,
    amount_cents: amountCents,
    reason,
    actor_user_id: actorUserId,
    status: "SUCCEEDED",
  });
  // amount_refunded_cents is kept in step by the sync_order_refund_total
  // trigger (0004_payments.sql) — not set here.
  assertPaymentTransition("CAPTURED", "REFUNDED");
  await db.from("orders").update({ payment_status: "REFUNDED" }).eq("id", orderId).eq("payment_status", "CAPTURED");

  return { status: "REFUNDED", amountCents };
}

async function recordFailure(
  orderId: string,
  paymentId: string | null,
  amountCents: number,
  reason: string,
  actorUserId: string | null,
  failure: string,
  raw?: unknown,
): Promise<RefundResult> {
  const db = serviceClient();
  await alert(`Refund failed for order ${orderId} (${amountCents}¢): ${failure}`);
  if (paymentId) {
    await db.from("refunds").insert({ payment_id: paymentId, amount_cents: amountCents, reason, actor_user_id: actorUserId, status: "FAILED" });
  }
  await db.from("audit_log").insert({
    actor_user_id: actorUserId,
    action: "REFUND_FAILED",
    entity: "orders",
    entity_id: orderId,
    after: { reason, failure, amountCents, raw: (raw ?? null) as Json },
  });
  return { status: "FAILED", reason: failure };
}
