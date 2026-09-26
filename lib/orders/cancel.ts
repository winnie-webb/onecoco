import { serviceClient } from "@/lib/db/client";
import { getProvider } from "@/lib/payments";
import { assertFulfillmentTransition, assertPaymentTransition } from "@/lib/orders/state";

export class CancelError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "CancelError";
  }
}

/**
 * §5: "CANCELLED has one shape but six causes with different money
 * outcomes." This is the OPS-initiated cause — the admin order board's
 * "intervene on stuck orders" (§15). A captured card payment is refunded in
 * full; a cash order that hasn't been collected yet just cancels, since
 * there's nothing to give back.
 */
export async function cancelOrderAsOps(orderId: string, reason: string, actorUserId: string): Promise<void> {
  const db = serviceClient();

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, fulfillment_status, payment_status, amount_captured_cents")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new CancelError("order not found", "NOT_FOUND");

  assertFulfillmentTransition(order.fulfillment_status, "CANCELLED");

  const { error: updateError } = await db
    .from("orders")
    .update({ fulfillment_status: "CANCELLED", cancelled_at: new Date().toISOString(), cancelled_by: "OPS", cancellation_reason: reason })
    .eq("id", orderId)
    .eq("fulfillment_status", order.fulfillment_status);
  if (updateError) throw new CancelError(`could not cancel order: ${updateError.message}`, "INTERNAL");

  if (order.payment_status === "CAPTURED" && order.amount_captured_cents > 0) {
    const { data: payment } = await db
      .from("payments")
      .select("id, provider, provider_capture_id")
      .eq("order_id", orderId)
      .eq("status", "CAPTURED")
      .maybeSingle();

    if (payment?.provider_capture_id) {
      const provider = await getProvider(payment.provider);
      const outcome = await provider.refund({
        providerCaptureId: payment.provider_capture_id,
        amountCents: order.amount_captured_cents,
        reason: `order cancelled by ops: ${reason}`,
      });

      if (outcome.status === "SUCCEEDED") {
        await db.from("refunds").insert({
          payment_id: payment.id,
          provider_refund_id: outcome.providerRefundId,
          amount_cents: order.amount_captured_cents,
          reason,
          actor_user_id: actorUserId,
          status: "SUCCEEDED",
        });
        // amount_refunded_cents is kept in step by the sync_order_refund_total
        // trigger (0004_payments.sql) — not set here.
        assertPaymentTransition("CAPTURED", "REFUNDED");
        await db.from("orders").update({ payment_status: "REFUNDED" }).eq("id", orderId).eq("payment_status", "CAPTURED");
      }
    }
  }
}
