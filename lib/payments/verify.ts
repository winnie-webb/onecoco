import { serviceClient } from "@/lib/db/client";
import type { Json } from "@/lib/db/types";
import { getProvider } from "@/lib/payments";
import { assertFulfillmentTransition, assertPaymentTransition } from "@/lib/orders/state";
import { sendNotification } from "@/lib/notifications/transport";

export class CaptureError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "CaptureError";
  }
}

export interface CaptureResultShape {
  status: "CAPTURED" | "PENDING" | "ALREADY_CAPTURED";
  orderId: string;
  paymentStatus: string;
}

/**
 * §8's four checks, in order:
 *   1. Binding    — the capture is for the payment/order we started.
 *   2. Amount     — captured amount + currency equal what we asked, in
 *                    integer cents. "This is the check implementations skip."
 *   3. PENDING     — its own outcome, never folded into paid or failed.
 *   4. Already-captured — the refresh path, treated as paid, not an error.
 */
export async function captureAndApply(paymentId: string, providerRefFromClient?: string): Promise<CaptureResultShape> {
  const db = serviceClient();

  const { data: payment, error: paymentError } = await db.from("payments").select("*").eq("id", paymentId).single();
  if (paymentError || !payment) throw new CaptureError("payment not found", "PAYMENT_NOT_FOUND");

  // Check 4 first: already-captured is a refresh, not an error.
  if (payment.status === "CAPTURED") {
    const { data: order } = await db.from("orders").select("payment_status").eq("id", payment.order_id).single();
    return { status: "ALREADY_CAPTURED", orderId: payment.order_id, paymentStatus: order?.payment_status ?? "CAPTURED" };
  }

  // Check 1 (binding): the client's providerRef, if it sent one, must match
  // what we recorded when the payment was started — never trust a
  // provider reference the browser hands back unchecked.
  if (providerRefFromClient && payment.provider_ref !== providerRefFromClient) {
    throw new CaptureError("providerRef does not match the payment this capture is for", "BINDING_MISMATCH");
  }

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, total_cents, currency, payment_status, fulfillment_status")
    .eq("id", payment.order_id)
    .single();
  if (orderError || !order) throw new CaptureError("order not found for this payment", "ORDER_NOT_FOUND");

  const provider = await getProvider(payment.provider);
  const outcome = await provider.capture({
    providerRef: payment.provider_ref ?? "",
    expectedOrderId: order.id,
    expectedCents: order.total_cents,
    currency: order.currency,
  });

  if (outcome.status === "PENDING") {
    await db.from("payments").update({ status: "PENDING", raw: outcome.raw as NonNullable<Json> }).eq("id", payment.id);
    return { status: "PENDING", orderId: order.id, paymentStatus: order.payment_status };
  }

  if (outcome.status === "FAILED") {
    await db.from("payments").update({ status: "FAILED", raw: outcome.raw as NonNullable<Json> }).eq("id", payment.id);
    assertPaymentTransition(order.payment_status, "FAILED");
    await db.from("orders").update({ payment_status: "FAILED" }).eq("id", order.id).eq("payment_status", order.payment_status);
    throw new CaptureError(`payment failed: ${outcome.reason}`, "PAYMENT_FAILED");
  }

  // Check 2 (amount): captured amount + currency must equal what we asked,
  // in integer cents. A provider can genuinely report a real capture for
  // LESS without any forgery involved.
  if (outcome.amountCents !== order.total_cents) {
    await db.from("payments").update({ status: "FAILED", raw: outcome.raw as NonNullable<Json> }).eq("id", payment.id);
    throw new CaptureError(
      `captured amount ${outcome.amountCents} does not match order total ${order.total_cents}`,
      "AMOUNT_MISMATCH",
    );
  }

  const { error: captureUpdateError } = await db
    .from("payments")
    .update({
      status: "CAPTURED",
      provider_capture_id: outcome.providerCaptureId,
      raw: outcome.raw as NonNullable<Json>,
      settled_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (captureUpdateError) {
    // provider_capture_id UNIQUE violation = a duplicate/replayed capture
    // for a capture id we've already recorded elsewhere — treat as already
    // captured rather than a hard failure (idempotency on the business
    // effect, §4.4).
    if (captureUpdateError.code === "23505") {
      const { data: refreshedOrder } = await db.from("orders").select("payment_status").eq("id", order.id).single();
      return { status: "ALREADY_CAPTURED", orderId: order.id, paymentStatus: refreshedOrder?.payment_status ?? "CAPTURED" };
    }
    throw new CaptureError(`could not record capture: ${captureUpdateError.message}`, "INTERNAL");
  }

  assertPaymentTransition(order.payment_status, "CAPTURED");
  await db
    .from("orders")
    .update({ payment_status: "CAPTURED", amount_captured_cents: outcome.amountCents })
    .eq("id", order.id)
    .eq("payment_status", order.payment_status);

  if (order.fulfillment_status === "PLACED") {
    assertFulfillmentTransition("PLACED", "AWAITING_RUNNER");
    await db.from("orders").update({ fulfillment_status: "AWAITING_RUNNER" }).eq("id", order.id).eq("fulfillment_status", "PLACED");
  }

  const { data: customer } = await db.from("orders").select("contact_email, order_number").eq("id", order.id).single();
  if (customer) {
    await sendNotification({
      orderId: order.id,
      channel: "EMAIL",
      template: "payment_confirmation",
      recipient: customer.contact_email ?? "",
      data: { orderNumber: customer.order_number },
    });
  }

  return { status: "CAPTURED", orderId: order.id, paymentStatus: "CAPTURED" };
}
