import { NextResponse } from "next/server";
import { createOrder, OrderCreationError } from "@/lib/orders/create";

export const dynamic = "force-dynamic";

interface OrdersBody {
  quoteId?: unknown;
  clientIdempotencyKey?: unknown;
  contact?: { name?: unknown; phone?: unknown; email?: unknown };
  landmarkText?: unknown;
  customerDescription?: unknown;
  deliveryNote?: unknown;
  location?: { lat?: unknown; lng?: unknown; accuracyM?: unknown };
  paymentProvider?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const ORDER_CREATION_ERROR_STATUS: Record<string, number> = {
  QUOTE_NOT_FOUND: 404,
  QUOTE_EXPIRED: 409,
  ZONE_NOT_FOUND: 404,
  PRICE_CHANGED: 409,
  ZONE_CLOSED: 409,
  ZONE_PAUSED: 409,
  OUTSIDE_OPERATING_HOURS: 409,
  NO_RUNNER_ON_SHIFT: 409,
  OUT_OF_STOCK: 409,
};

/** §13 `POST /api/v1/orders` — create order (idempotency key required). */
export async function POST(request: Request) {
  let body: OrdersBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!isNonEmptyString(body.quoteId) || !isNonEmptyString(body.clientIdempotencyKey)) {
    return NextResponse.json({ error: "quoteId and clientIdempotencyKey are required" }, { status: 400 });
  }
  const contact = body.contact;
  if (!contact || !isNonEmptyString(contact.name) || !isNonEmptyString(contact.phone) || !isNonEmptyString(contact.email)) {
    return NextResponse.json({ error: "contact.name, contact.phone and contact.email are required" }, { status: 400 });
  }
  if (body.paymentProvider !== "mock" && body.paymentProvider !== "cash") {
    return NextResponse.json({ error: 'paymentProvider must be "mock" or "cash"' }, { status: 400 });
  }

  let location: { lat: number; lng: number; accuracyM?: number } | undefined;
  if (body.location) {
    const { lat, lng, accuracyM } = body.location;
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
      return NextResponse.json({ error: "location.lat/lng must be finite numbers" }, { status: 400 });
    }
    location = { lat, lng, accuracyM: isFiniteNumber(accuracyM) ? accuracyM : undefined };
  }

  try {
    const order = await createOrder({
      quoteId: body.quoteId,
      clientIdempotencyKey: body.clientIdempotencyKey,
      contact: { name: contact.name.trim(), phone: contact.phone.trim(), email: contact.email.trim() },
      landmarkText: isNonEmptyString(body.landmarkText) ? body.landmarkText : undefined,
      customerDescription: isNonEmptyString(body.customerDescription) ? body.customerDescription : undefined,
      deliveryNote: isNonEmptyString(body.deliveryNote) ? body.deliveryNote : undefined,
      location,
      paymentProvider: body.paymentProvider,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderCreationError) {
      const status = ORDER_CREATION_ERROR_STATUS[err.code] ?? 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("order creation failed", err);
    return NextResponse.json({ error: "could not create order" }, { status: 500 });
  }
}
