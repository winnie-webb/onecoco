import { NextResponse } from "next/server";
import { captureAndApply, CaptureError } from "@/lib/payments/verify";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface CaptureBody {
  paymentId?: unknown;
  providerRef?: unknown;
}

const ERROR_STATUS: Record<string, number> = {
  PAYMENT_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  BINDING_MISMATCH: 400,
  AMOUNT_MISMATCH: 502,
  PAYMENT_FAILED: 402,
  ORDER_NOT_PAYABLE: 409,
};

/** §13 `POST /api/v1/payments/:provider/capture` — server-side capture + the four checks. */
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;

  let body: CaptureBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  let paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
  const providerRef = typeof body.providerRef === "string" ? body.providerRef : undefined;

  // The PayPal return page may have lost its sessionStorage (PayPal's app
  // can hand back to a different browser), leaving only PayPal's `token`.
  // Look the payment up by it — the row was written before redirect, so
  // the browser still can't name a payment we didn't create.
  if (!paymentId && providerRef && provider === "paypal") {
    const { data } = await serviceClient()
      .from("payments")
      .select("id")
      .eq("provider", "paypal")
      .eq("provider_ref", providerRef)
      .maybeSingle();
    paymentId = data?.id ?? null;
  }
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId (or a known providerRef) is required" }, { status: 400 });
  }

  try {
    const result = await captureAndApply(paymentId, providerRef);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CaptureError) {
      return NextResponse.json({ error: err.message, code: err.code, provider }, { status: ERROR_STATUS[err.code] ?? 400 });
    }
    console.error("capture failed", err);
    return NextResponse.json({ error: "capture failed", provider }, { status: 500 });
  }
}
