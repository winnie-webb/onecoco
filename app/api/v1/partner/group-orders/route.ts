import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/partner-guards";
import { serviceClient } from "@/lib/db/client";
import { getSettings } from "@/lib/settings";
import { buildQuote, QuoteError } from "@/lib/pricing/quote";
import { createOrder, OrderCreationError } from "@/lib/orders/create";

export const dynamic = "force-dynamic";

interface GroupOrderBody {
  productId?: unknown;
  qty?: unknown;
  scheduledFor?: unknown;
  contact?: { name?: unknown; phone?: unknown; email?: unknown };
  note?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * §2's "B2B group orders — a tour operator pre-ordering 30 for 11:30.
 * Scheduled + quantity + invoice, sharing the same order spine." This is
 * the scoped MVP version: real `scheduled_for`, real quantity, real order
 * spine — but "invoice" has no dedicated payment concept yet (§27's open
 * questions don't cover this either), so it's created via the existing
 * `cash` provider (`CASH_DUE`) as the closest honest fit, documented as a
 * placeholder in PHASE-9-NOTES.md rather than inventing new payment
 * semantics this codebase hasn't been asked to support yet.
 *
 * No location is captured for a group order (there's no customer standing
 * on the beach with a phone) — `createOrder` already falls back to the
 * zone's configured ETA bounds when that happens (Phase 3).
 */
export async function POST(request: Request) {
  const guard = await requirePartnerApi();
  if ("response" in guard) return guard.response;

  let body: GroupOrderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!isNonEmptyString(body.productId)) return NextResponse.json({ error: "productId is required" }, { status: 400 });
  const qty = Number(body.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 200) {
    return NextResponse.json({ error: "qty must be an integer between 1 and 200" }, { status: 400 });
  }
  if (!isNonEmptyString(body.scheduledFor) || Number.isNaN(Date.parse(body.scheduledFor))) {
    return NextResponse.json({ error: "scheduledFor must be a valid date/time" }, { status: 400 });
  }
  if (new Date(body.scheduledFor).getTime() <= Date.now()) {
    return NextResponse.json({ error: "scheduledFor must be in the future" }, { status: 400 });
  }
  const contact = body.contact;
  if (!contact || !isNonEmptyString(contact.name) || !isNonEmptyString(contact.phone) || !isNonEmptyString(contact.email)) {
    return NextResponse.json({ error: "contact.name, contact.phone and contact.email are required" }, { status: 400 });
  }

  const db = serviceClient();
  const { session } = guard;

  const { data: partner } = await db.from("partners").select("beach_id").eq("id", session.partnerId).single();
  if (!partner?.beach_id) return NextResponse.json({ error: "your partner account has no beach configured" }, { status: 400 });

  const { data: zone } = await db
    .from("delivery_zones")
    .select("id, delivery_fee_cents")
    .eq("beach_id", partner.beach_id)
    .eq("active", true)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!zone) return NextResponse.json({ error: "no delivery zone configured for your beach" }, { status: 400 });

  try {
    const settings = await getSettings();
    const quote = await buildQuote([{ productId: body.productId, qty, selections: [] }], zone.id, zone.delivery_fee_cents, settings);

    const order = await createOrder({
      quoteId: quote.quoteId,
      clientIdempotencyKey: crypto.randomUUID(),
      contact: { name: contact.name.trim(), phone: contact.phone.trim(), email: contact.email.trim() },
      deliveryNote: isNonEmptyString(body.note) ? body.note : undefined,
      paymentProvider: "cash",
      scheduledFor: body.scheduledFor,
    });

    // createOrder doesn't know about partner attribution (only the public
    // customer flow's QR path sets that) — a group order IS the partner's
    // own order, so it's attributed directly here.
    await db.from("orders").update({ partner_id: session.partnerId }).eq("id", order.orderId);

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof QuoteError || err instanceof OrderCreationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("group order creation failed", err);
    return NextResponse.json({ error: "could not create group order" }, { status: 500 });
  }
}
