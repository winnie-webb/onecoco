import { NextResponse } from "next/server";
import { captureAndApply, CaptureError } from "@/lib/payments/verify";

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
  if (typeof body.paymentId !== "string") {
    return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
  }

  try {
    const result = await captureAndApply(body.paymentId, typeof body.providerRef === "string" ? body.providerRef : undefined);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CaptureError) {
      return NextResponse.json({ error: err.message, code: err.code, provider }, { status: ERROR_STATUS[err.code] ?? 400 });
    }
    console.error("capture failed", err);
    return NextResponse.json({ error: "capture failed", provider }, { status: 500 });
  }
}
