import { serviceClient } from "@/lib/db/client";
import { captureAndApply } from "@/lib/payments/verify";

/**
 * §8 webhook rules: raw body read BEFORE any JSON parse (the caller's job —
 * see the route), verify signature, log the receipt, apply the effect in a
 * second pass. §4.4: `webhook_events.provider_event_id` de-dupes RETRIES of
 * the same event only — it does not de-dupe two different events about the
 * same money, nor handle out-of-order arrival. The real guards are
 * `payments.provider_capture_id` / `refunds.provider_refund_id` UNIQUE,
 * enforced inside `captureAndApply` and here respectively.
 *
 * NOT VERIFIED against a real PayPal sandbox event — see paypal.ts's own
 * header and PHASE-5-NOTES.md.
 */

interface PayPalWebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

async function verifySignature(rawBody: string, headers: PayPalWebhookHeaders): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!webhookId || !clientId || !secret) return false;

  const baseUrl = process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) return false;
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!verifyRes.ok) return false;
  const { verification_status } = (await verifyRes.json()) as { verification_status: string };
  return verification_status === "SUCCESS";
}

interface PayPalEvent {
  id: string;
  event_type: string;
  resource: {
    id: string; // capture id for CAPTURE events
    supplementary_data?: { related_ids?: { order_id?: string } };
    custom_id?: string;
  };
}

export async function handlePayPalWebhook(rawBody: string, headers: PayPalWebhookHeaders): Promise<{ status: number; body: unknown }> {
  const verified = await verifySignature(rawBody, headers);
  if (!verified) {
    return { status: 400, body: { error: "signature verification failed" } };
  }

  const event = JSON.parse(rawBody) as PayPalEvent;
  const db = serviceClient();

  // Retry-of-same-event dedupe (§4.4) — a different insert path per event
  // id, not per business effect.
  const { error: insertError } = await db.from("webhook_events").insert({
    provider: "paypal",
    provider_event_id: event.id,
    type: event.event_type,
    payload: event as unknown as NonNullable<import("@/lib/db/types").Json>,
  });
  if (insertError) {
    // 23505 = unique_violation on (provider, provider_event_id) — we've
    // seen this exact event before. Ack it and stop; do not reprocess.
    if (insertError.code === "23505") return { status: 200, body: { ok: true, duplicate: true } };
    return { status: 500, body: { error: "could not log webhook event" } };
  }

  try {
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event.resource.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const { data: payment } = await db.from("payments").select("id").eq("provider", "paypal").eq("provider_ref", orderId).maybeSingle();
        if (payment) await captureAndApply(payment.id);
      }
    }
    // Other event types (DENIED, REFUNDED via PayPal-initiated refund, etc.)
    // are logged above but have no automated effect yet — surfaced to ops
    // via the webhook_events table, not silently dropped.

    await db.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("provider", "paypal").eq("provider_event_id", event.id);
    return { status: 200, body: { ok: true } };
  } catch (err) {
    await db
      .from("webhook_events")
      .update({ error: err instanceof Error ? err.message : String(err) })
      .eq("provider", "paypal")
      .eq("provider_event_id", event.id);
    // Still 200: our own processing bug shouldn't make PayPal retry-storm
    // an event it already delivered correctly. The `error` column is the
    // signal for ops to investigate, not an automatic retry trigger.
    return { status: 200, body: { ok: false, error: "processing failed, logged for review" } };
  }
}
