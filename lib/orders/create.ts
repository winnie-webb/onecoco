import crypto from "node:crypto";
import { serviceClient } from "@/lib/db/client";
import { checkServiceability } from "@/lib/pricing/serviceability";
import { computeEta } from "@/lib/pricing/eta";
import { computeQuote, type CartItem } from "@/lib/pricing/quote";
import { getSettings } from "@/lib/settings";
import { assertFulfillmentTransition, type PaymentStatus } from "@/lib/orders/state";
import { sendNotification } from "@/lib/notifications/transport";
import { createOffersForOrder } from "@/lib/dispatch/offers";

export class OrderCreationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "OrderCreationError";
  }
}

export interface CreateOrderInput {
  quoteId: string;
  clientIdempotencyKey: string;
  contact: { name: string; phone: string; email: string };
  landmarkText?: string;
  customerDescription?: string;
  deliveryNote?: string;
  location?: { lat: number; lng: number; accuracyM?: number };
  paymentProvider: "mock" | "cash";
}

export interface CreatedOrder {
  orderId: string;
  orderNumber: number;
  trackToken: string;
  deliveryCode: string;
  paymentProvider: string;
  paymentStatus: PaymentStatus;
  totalCents: number;
  currency: string;
}

function generateTrackToken(): { raw: string; hash: string } {
  // ≥128 bits from a CSPRNG (§10). 32 bytes here, not the minimum 16 —
  // headroom costs nothing and the token never appears anywhere but a URL
  // the customer holds.
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

/**
 * §13 `POST /api/v1/orders`. Idempotent on `client_idempotency_key` — a
 * double-tapped Pay button on a laggy connection is the expected case
 * (§8), not an error.
 *
 * One wrinkle the architecture doesn't spell out: on a replay we cannot
 * return the ORIGINAL raw track token, because we only ever stored its
 * hash (§10) — and a replay only happens because the first response
 * (which carried that token) may never have reached the browser. The fix
 * is to rotate the token on replay and return the new one; the old link
 * silently stops working, which is an acceptable cost against never being
 * able to recover a token from its hash.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const db = serviceClient();

  const existing = await db
    .from("orders")
    .select("id, order_number, delivery_code, total_cents, currency, payment_status")
    .eq("client_idempotency_key", input.clientIdempotencyKey)
    .maybeSingle();
  if (existing.error) throw new OrderCreationError("idempotency lookup failed", "INTERNAL");

  if (existing.data) {
    const { raw, hash } = generateTrackToken();
    const { error: rotateError } = await db.from("orders").update({ track_token_hash: hash }).eq("id", existing.data.id);
    if (rotateError) throw new OrderCreationError("could not rotate track token", "INTERNAL");
    return {
      orderId: existing.data.id,
      orderNumber: existing.data.order_number,
      trackToken: raw,
      deliveryCode: existing.data.delivery_code,
      paymentProvider: input.paymentProvider,
      paymentStatus: existing.data.payment_status,
      totalCents: existing.data.total_cents,
      currency: existing.data.currency,
    };
  }

  const { data: quoteRow, error: quoteError } = await db.from("quotes").select("*").eq("id", input.quoteId).single();
  if (quoteError || !quoteRow) throw new OrderCreationError("quote not found", "QUOTE_NOT_FOUND");
  if (new Date(quoteRow.expires_at) <= new Date()) throw new OrderCreationError("quote has expired", "QUOTE_EXPIRED");

  const payload = quoteRow.payload as unknown as { cart: CartItem[]; zoneId: string };
  const { data: zone, error: zoneError } = await db.from("delivery_zones").select("*").eq("id", payload.zoneId).single();
  if (zoneError || !zone) throw new OrderCreationError("zone not found", "ZONE_NOT_FOUND");

  const serviceability = await checkServiceability(zone);
  if (!serviceability.serviceable) {
    throw new OrderCreationError(`zone is no longer serviceable: ${serviceability.reason}`, serviceability.reason);
  }

  // §7: re-quote and compare against what the customer was shown, rather
  // than trusting a quote that may have gone stale between quote and pay.
  const settings = await getSettings();
  const fresh = await computeQuote(payload.cart, payload.zoneId, zone.delivery_fee_cents, settings);
  if (fresh.totalCents !== quoteRow.total_cents) {
    throw new OrderCreationError(
      `price changed since quote (was ${quoteRow.total_cents}, now ${fresh.totalCents})`,
      "PRICE_CHANGED",
    );
  }

  const { data: prepPoint } = await db
    .from("prep_points")
    .select("id")
    .eq("beach_id", zone.beach_id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  const email = input.contact.email.trim().toLowerCase();
  let customerId: string;
  const { data: existingCustomer } = await db.from("customers").select("id").ilike("email", email).maybeSingle();
  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: customerError } = await db
      .from("customers")
      .insert({ email, phone: input.contact.phone, name: input.contact.name })
      .select("id")
      .single();
    if (customerError || !newCustomer) throw new OrderCreationError("could not create customer", "INTERNAL");
    customerId = newCustomer.id;
  }

  const { raw: trackToken, hash: trackTokenHash } = generateTrackToken();
  const isCash = input.paymentProvider === "cash";
  const acceptDeadlineAt = new Date(Date.now() + settings.acceptWindowMinutes * 60_000);

  // §7: ETA is persisted at order time so the displayed promise can't
  // silently drift, and on-time rate is measurable later. Falls back to the
  // zone's configured bounds (no travel term) when checkout didn't carry a
  // location fix — still honest, just less precise.
  const eta = input.location
    ? await computeEta(zone, input.location.lng, input.location.lat, settings)
    : { etaMinMinutes: zone.eta_min_minutes, etaMaxMinutes: zone.eta_max_minutes };
  const now = Date.now();
  const promisedEtaMinAt = new Date(now + eta.etaMinMinutes * 60_000);
  const promisedEtaMaxAt = new Date(now + eta.etaMaxMinutes * 60_000);

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      customer_id: customerId,
      beach_id: zone.beach_id,
      zone_id: zone.id,
      prep_point_id: prepPoint?.id ?? null,
      quote_id: input.quoteId,
      client_idempotency_key: input.clientIdempotencyKey,
      payment_status: isCash ? "CASH_DUE" : "UNPAID",
      subtotal_cents: fresh.subtotalCents,
      customization_cents: fresh.customizationCents,
      delivery_fee_cents: fresh.deliveryFeeCents,
      tax_cents: fresh.taxCents,
      total_cents: fresh.totalCents,
      currency: fresh.currency,
      contact_name: input.contact.name,
      contact_phone: input.contact.phone,
      contact_email: email,
      landmark_text: input.landmarkText ?? null,
      customer_description: input.customerDescription ?? null,
      delivery_note: input.deliveryNote ?? null,
      track_token_hash: trackTokenHash,
      accept_deadline_at: acceptDeadlineAt.toISOString(),
      promised_eta_min_at: promisedEtaMinAt.toISOString(),
      promised_eta_max_at: promisedEtaMaxAt.toISOString(),
    })
    .select("id, order_number, delivery_code, payment_status")
    .single();
  if (orderError || !order) throw new OrderCreationError(`could not create order: ${orderError?.message}`, "INTERNAL");

  for (const line of fresh.lines) {
    const { data: orderItem, error: itemError } = await db
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: line.productId,
        qty: line.qty,
        unit_price_cents: line.unitPriceCents,
        line_total_cents: line.lineTotalCents,
        name_snapshot: line.name,
      })
      .select("id")
      .single();
    if (itemError || !orderItem) throw new OrderCreationError("could not create order item", "INTERNAL");

    if (line.customizations.length > 0) {
      const { error: custError } = await db.from("order_item_customizations").insert(
        line.customizations.map((c) => ({
          order_item_id: orderItem.id,
          group_id: c.groupId,
          option_id: c.optionId,
          text_value: c.optionId ? null : c.valueLabel,
          price_delta_cents: c.priceDeltaCents,
          label_snapshot: `${c.label}: ${c.valueLabel}`,
        })),
      );
      if (custError) throw new OrderCreationError("could not create order item customizations", "INTERNAL");
    }
  }

  if (input.location) {
    await db.from("order_locations").insert({
      order_id: order.id,
      point: `POINT(${input.location.lng} ${input.location.lat})`,
      accuracy_m: input.location.accuracyM ?? null,
      source: "CHECKOUT",
    });
  }

  if (isCash) {
    // Cash is confirmed and dispatchable immediately — it never passes
    // through PAID (§4.3).
    assertFulfillmentTransition("PLACED", "AWAITING_RUNNER");
    await db
      .from("orders")
      .update({ fulfillment_status: "AWAITING_RUNNER" })
      .eq("id", order.id)
      .eq("fulfillment_status", "PLACED");
    await createOffersForOrder(order.id);
  }

  await sendNotification({
    orderId: order.id,
    channel: "EMAIL",
    template: "order_confirmation",
    recipient: email,
    data: { orderNumber: order.order_number, totalCents: fresh.totalCents },
  });

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    trackToken,
    deliveryCode: order.delivery_code,
    paymentProvider: input.paymentProvider,
    paymentStatus: order.payment_status,
    totalCents: fresh.totalCents,
    currency: fresh.currency,
  };
}
