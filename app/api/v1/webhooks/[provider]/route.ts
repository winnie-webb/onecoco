import { NextResponse } from "next/server";
import { handlePayPalWebhook } from "@/lib/payments/paypal-webhook";

export const dynamic = "force-dynamic";

/**
 * §13 `POST /api/v1/webhooks/:provider`. §8: read the RAW body before any
 * JSON parse, or signature verification breaks — `request.text()` here,
 * never `request.json()`.
 */
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const rawBody = await request.text();

  if (provider === "paypal") {
    const result = await handlePayPalWebhook(rawBody, {
      transmissionId: request.headers.get("paypal-transmission-id") ?? "",
      transmissionTime: request.headers.get("paypal-transmission-time") ?? "",
      certUrl: request.headers.get("paypal-cert-url") ?? "",
      authAlgo: request.headers.get("paypal-auth-algo") ?? "",
      transmissionSig: request.headers.get("paypal-transmission-sig") ?? "",
    });
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json({ error: `no webhook handler for provider "${provider}"` }, { status: 404 });
}
