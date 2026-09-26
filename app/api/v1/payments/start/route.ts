import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/client";
import { getProvider, ProviderNotConfiguredError } from "@/lib/payments";

export const dynamic = "force-dynamic";

interface StartBody {
  orderId?: unknown;
  provider?: unknown;
}

/** §13 `POST /api/v1/payments/start` — create provider payment from the stored total. */
export async function POST(request: Request) {
  let body: StartBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.orderId !== "string" || typeof body.provider !== "string") {
    return NextResponse.json({ error: "orderId and provider are required" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, total_cents, currency, payment_status")
    .eq("id", body.orderId)
    .single();
  if (orderError || !order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  if (order.payment_status !== "UNPAID") {
    return NextResponse.json({ error: `order payment_status is ${order.payment_status}, not UNPAID` }, { status: 409 });
  }

  try {
    const provider = await getProvider(body.provider);
    if (!provider.isConfigured()) {
      return NextResponse.json({ error: `provider "${provider.name}" is not configured` }, { status: 503 });
    }

    const started = await provider.start({ orderId: order.id, amountCents: order.total_cents, currency: order.currency });

    const { data: payment, error: paymentError } = await db
      .from("payments")
      .insert({
        order_id: order.id,
        provider: provider.name as "mock" | "cash" | "paypal" | "stripe",
        provider_ref: started.providerRef,
        status: "INITIATED",
        amount_cents: order.total_cents,
        currency: order.currency,
        environment: provider.environment(),
      })
      .select("id")
      .single();
    if (paymentError || !payment) throw new Error(paymentError?.message ?? "payment insert failed");

    return NextResponse.json({ paymentId: payment.id, providerRef: started.providerRef, redirectUrl: started.redirectUrl ?? null });
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("payment start failed", err);
    return NextResponse.json({ error: "could not start payment" }, { status: 500 });
  }
}
