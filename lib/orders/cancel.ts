import { serviceClient } from "@/lib/db/client";
import { assertFulfillmentTransition } from "@/lib/orders/state";
import { refundOrderInFull, type RefundResult } from "@/lib/payments/refund";
import { releaseOrderStock } from "@/lib/orders/stock";

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
export async function cancelOrderAsOps(orderId: string, reason: string, actorUserId: string): Promise<RefundResult> {
  const db = serviceClient();

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, fulfillment_status")
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

  // Take it off runners' offer lists (offers stay open up to an hour).
  await db
    .from("order_offers")
    .update({ response: "EXPIRED", responded_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("response", null);

  // Not picked up yet: the coconut is still in the cooler, back into stock.
  // Once it's out for delivery it's been cut open — it stays counted as used.
  if (order.fulfillment_status === "PLACED" || order.fulfillment_status === "AWAITING_RUNNER" || order.fulfillment_status === "ASSIGNED") {
    await releaseOrderStock(orderId);
  }

  // Uncollected cash: nothing to give back, but the debt is gone too.
  await db.from("orders").update({ payment_status: "VOIDED" }).eq("id", orderId).eq("payment_status", "CASH_DUE");

  return refundOrderInFull(orderId, `order cancelled by ops: ${reason}`, actorUserId);
}
