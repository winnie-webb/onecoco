import type { CaptureArgs, CaptureOutcome, PaymentEnvironment, PaymentProvider, RefundArgs, RefundOutcome, StartArgs, StartResult } from "./index";

/**
 * §8's second provider. PayPal Orders v2, server-side capture: approving
 * only AUTHORISES (`intent: CAPTURE` still requires the separate capture
 * call below) — a customer whose signal drops mid-redirect on a beach has
 * genuinely not paid, and our records are honest by construction.
 *
 * NOT VERIFIED AGAINST A REAL PAYPAL ACCOUNT. This sandbox has neither
 * PayPal sandbox credentials nor network egress to `api-m.sandbox.
 * paypal.com` (confirmed: the agent proxy rejects the CONNECT outright —
 * an organization policy denial, not a missing-credentials problem). The
 * HTTP calls below are written faithful to PayPal's public Orders v2 /
 * webhook-verification contracts; only the pure response-parsing logic
 * (`parseCaptureResponse`) has actually been exercised, with a fabricated
 * response shaped like PayPal's documented schema — see
 * lib/payments/__tests__ or PHASE-5-NOTES.md for what that test covers and
 * what it doesn't. §8's own go-live checklist already requires this to be
 * verified with a real sandbox event before launch; that item is still
 * open.
 */

function baseUrl(): string {
  return process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function environment(): PaymentEnvironment {
  return process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET not configured");

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth token request failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

interface PayPalCapture {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
  custom_id?: string;
  invoice_id?: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  purchase_units?: { payments?: { captures?: PayPalCapture[] } }[];
}

/**
 * Pure — no network. Maps a PayPal order/capture response onto our
 * `CaptureOutcome`, applying §8 check 1 (binding: the capture's `custom_id`
 * must equal the order id we issued) at this layer too, ahead of
 * `lib/payments/verify.ts`'s own binding check on `provider_ref`. Exported
 * so it can be unit tested with a fabricated response shaped like PayPal's
 * documented schema, without a live API call.
 */
export function parseCaptureResponse(order: PayPalOrderResponse, expectedOrderId: string): CaptureOutcome {
  if (order.status === "PENDING") {
    return { status: "PENDING", raw: order };
  }

  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) {
    return { status: "FAILED", reason: "no capture in PayPal response", raw: order };
  }

  if (capture.custom_id !== expectedOrderId) {
    return { status: "FAILED", reason: `custom_id mismatch: expected ${expectedOrderId}, got ${capture.custom_id}`, raw: order };
  }

  if (capture.status === "PENDING") {
    return { status: "PENDING", raw: order };
  }
  if (capture.status !== "COMPLETED") {
    return { status: "FAILED", reason: `capture status was ${capture.status}`, raw: order };
  }

  const amountCents = Math.round(Number(capture.amount.value) * 100);
  if (!Number.isFinite(amountCents)) {
    return { status: "FAILED", reason: `unparseable capture amount: ${capture.amount.value}`, raw: order };
  }

  return { status: "CAPTURED", providerCaptureId: capture.id, amountCents, raw: order };
}

export const paypalProvider: PaymentProvider = {
  name: "paypal",

  isConfigured() {
    return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  },

  environment,

  async start(args: StartArgs): Promise<StartResult> {
    const token = await getAccessToken();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": args.orderId,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: args.orderId,
            invoice_id: args.orderId,
            amount: { currency_code: args.currency, value: (args.amountCents / 100).toFixed(2) },
          },
        ],
        application_context: {
          return_url: `${siteUrl}/api/v1/payments/paypal/return`,
          cancel_url: `${siteUrl}/order`,
        },
      }),
    });
    if (!res.ok) throw new Error(`PayPal order creation failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as { id: string; links: { rel: string; href: string }[] };
    const approve = data.links.find((l) => l.rel === "approve");
    return { providerRef: data.id, redirectUrl: approve?.href };
  },

  async capture(args: CaptureArgs): Promise<CaptureOutcome> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl()}/v2/checkout/orders/${args.providerRef}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": args.expectedOrderId,
      },
    });
    const body = (await res.json()) as PayPalOrderResponse;
    if (!res.ok) {
      return { status: "FAILED", reason: `PayPal capture returned ${res.status}`, raw: body };
    }
    return parseCaptureResponse(body, args.expectedOrderId);
  },

  async refund(args: RefundArgs): Promise<RefundOutcome> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl()}/v2/payments/captures/${args.providerCaptureId}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: { value: (args.amountCents / 100).toFixed(2), currency_code: args.currency }, note_to_payer: args.reason }),
    });
    const body = await res.json();
    if (!res.ok) {
      return { status: "FAILED", reason: `PayPal refund returned ${res.status}`, raw: body };
    }
    return { status: "SUCCEEDED", providerRefundId: body.id, raw: body };
  },
};
