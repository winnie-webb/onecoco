import { serviceClient } from "@/lib/db/client";
import { getSettings } from "@/lib/settings";
import { assertFulfillmentTransition, assertPaymentTransition } from "@/lib/orders/state";
import { refundOrderInFull } from "@/lib/payments/refund";
import { sendNotification } from "@/lib/notifications/transport";
import { releaseOrderStock } from "@/lib/orders/stock";

export interface ExpirySummary {
  expired: number;
  refunded: number;
  refundFailures: { orderId: string; reason: string }[];
  abandonedUnpaid: number;
}

/**
 * Audit T-4 / ARCHITECTURE §5: "EXPIRED — swept by cron against
 * accept_deadline_at, auto-refunding and notifying". Called by the sweep
 * route every 5 minutes.
 *
 * 1. An order still AWAITING_RUNNER `expiryGraceMinutes` after its accept
 *    deadline is EXPIRED. The grace exists because orders_at_risk flags it
 *    on the admin board AT the deadline — ops get a few minutes to find a
 *    runner by phone before the customer is refunded. Card payments are
 *    refunded in full; cash-due is voided. The customer is emailed.
 * 2. A card order still PLACED/UNPAID after `unpaidAbandonMinutes` (customer
 *    closed the PayPal window, signal dropped) is EXPIRED and VOIDED so it
 *    stops cluttering the board. No money moved, so there's nothing to refund.
 *
 * Every write is conditional on the status we read (`.eq(status)` +
 * `.select()`): a runner accepting in the same instant wins, and we skip.
 */
export async function expireStaleOrders(now = new Date()): Promise<ExpirySummary> {
  const db = serviceClient();
  const settings = await getSettings();
  const summary: ExpirySummary = { expired: 0, refunded: 0, refundFailures: [], abandonedUnpaid: 0 };

  const acceptCutoff = new Date(now.getTime() - settings.expiryGraceMinutes * 60_000).toISOString();
  const { data: unaccepted, error } = await db
    .from("orders")
    .select("id, order_number, payment_status, contact_email")
    .eq("fulfillment_status", "AWAITING_RUNNER")
    .is("cancelled_at", null)
    .lt("accept_deadline_at", acceptCutoff);
  if (error) throw new Error(`expiry lookup failed: ${error.message}`);

  for (const order of unaccepted ?? []) {
    assertFulfillmentTransition("AWAITING_RUNNER", "EXPIRED");
    const { data: won } = await db
      .from("orders")
      .update({ fulfillment_status: "EXPIRED" })
      .eq("id", order.id)
      .eq("fulfillment_status", "AWAITING_RUNNER")
      .select("id");
    if (!won?.length) continue;
    summary.expired++;
    await releaseOrderStock(order.id);

    await db
      .from("order_offers")
      .update({ response: "EXPIRED", responded_at: now.toISOString() })
      .eq("order_id", order.id)
      .is("response", null);

    let refunded = false;
    if (order.payment_status === "CAPTURED") {
      const result = await refundOrderInFull(order.id, "No runner accepted the order in time", null);
      if (result.status === "REFUNDED") {
        refunded = true;
        summary.refunded++;
      } else if (result.status === "FAILED") {
        summary.refundFailures.push({ orderId: order.id, reason: result.reason });
      }
    } else if (order.payment_status === "CASH_DUE") {
      assertPaymentTransition("CASH_DUE", "VOIDED");
      await db.from("orders").update({ payment_status: "VOIDED" }).eq("id", order.id).eq("payment_status", "CASH_DUE");
    }

    if (order.contact_email) {
      await sendNotification({
        orderId: order.id,
        channel: "EMAIL",
        template: "order_expired",
        recipient: order.contact_email,
        data: { orderNumber: order.order_number, refunded, wasCard: order.payment_status === "CAPTURED" },
      });
    }
  }

  const unpaidCutoff = new Date(now.getTime() - settings.unpaidAbandonMinutes * 60_000).toISOString();
  const { data: abandoned, error: abandonedError } = await db
    .from("orders")
    .select("id")
    .eq("fulfillment_status", "PLACED")
    .eq("payment_status", "UNPAID")
    .lt("placed_at", unpaidCutoff);
  if (abandonedError) throw new Error(`abandoned-order lookup failed: ${abandonedError.message}`);

  for (const order of abandoned ?? []) {
    assertFulfillmentTransition("PLACED", "EXPIRED");
    assertPaymentTransition("UNPAID", "VOIDED");
    const { data: won } = await db
      .from("orders")
      .update({ fulfillment_status: "EXPIRED", payment_status: "VOIDED" })
      .eq("id", order.id)
      .eq("fulfillment_status", "PLACED")
      .eq("payment_status", "UNPAID")
      .select("id");
    if (won?.length) {
      summary.abandonedUnpaid++;
      await releaseOrderStock(order.id);
    }
  }

  return summary;
}
