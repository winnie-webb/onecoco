import { serviceClient } from "@/lib/db/client";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { brand, siteUrl } from "@/lib/brand";

/**
 * Pilot launch: tell the team the moment an order is ready to deliver.
 * Before this, the only signal was the admin board or runner app — both
 * silent, and both only if someone had the page open.
 *
 * Two channels, either or both:
 * - `ORDER_ALERT_WEBHOOK_URL`: any endpoint taking `{"text": "..."}` —
 *   a Slack incoming webhook, or a Discord channel webhook with `/slack`
 *   on the end (the Discord app then pushes to everyone's phone).
 * - `ORDER_ALERT_EMAILS`: comma-separated addresses, sent through Resend.
 *
 * Unlike `ALERT_WEBHOOK_URL` (lib/monitoring/alert.ts), this message
 * carries the customer's name, phone and location — the runner needs them
 * to find the customer — so it has its own variable: point it at a private
 * channel only the delivery team is in.
 *
 * Never throws: a failed alert must not fail the order or the payment.
 */

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export interface NewOrderAlert {
  orderNumber: number;
  beachName: string | null;
  items: { qty: number; name: string }[];
  totalCents: number;
  currency: string;
  cashDue: boolean;
  contactName: string | null;
  contactPhone: string | null;
  landmarkText: string | null;
  customerDescription: string | null;
  location: { lat: number; lng: number; accuracyM: number | null } | null;
  scheduledFor: string | null;
}

function money(cents: number, currency: string): string {
  return `${currency === "USD" ? "US$" : currency + " "}${(cents / 100).toFixed(2)}`;
}

/** Pure — exported for tests. Plain text that reads well in a phone
 * notification preview: the first line says what and where. */
export function buildNewOrderText(o: NewOrderAlert): string {
  const items = o.items.map((i) => `${i.qty}× ${i.name}`).join(", ");
  const lines = [
    `🥥 New order #${o.orderNumber}${o.beachName ? ` — ${o.beachName}` : ""}`,
    items,
    o.cashDue ? `COLLECT CASH: ${money(o.totalCents, o.currency)}` : `PAID by card: ${money(o.totalCents, o.currency)}`,
  ];
  if (o.scheduledFor) lines.push(`Scheduled for: ${o.scheduledFor}`);
  lines.push(`Customer: ${o.contactName ?? "—"}${o.contactPhone ? `, ${o.contactPhone}` : ""}`);
  if (o.landmarkText) lines.push(`Landmark: ${o.landmarkText}`);
  if (o.customerDescription) lines.push(`Look for: ${o.customerDescription}`);
  if (o.location) {
    const accuracy = o.location.accuracyM != null ? ` (GPS ±${Math.round(o.location.accuracyM)}m)` : "";
    lines.push(`Map: ${mapsUrl(o.location.lat, o.location.lng)}${accuracy}`);
  } else {
    lines.push("Map: no GPS fix — use the landmark and call them");
  }
  lines.push(`Accept it in the runner app: ${siteUrl}/runner/offers`);
  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => escapeHtml(line).replace(/(https:\/\/\S+)/g, '<a href="$1">$1</a>'))
    .join("<br>");
}

export async function loadNewOrderAlert(orderId: string): Promise<NewOrderAlert | null> {
  const db = serviceClient();
  const { data: order } = await db
    .from("orders")
    .select(
      "order_number, total_cents, currency, payment_status, contact_name, contact_phone, landmark_text, customer_description, scheduled_for, beaches(name), order_items(qty, name_snapshot)",
    )
    .eq("id", orderId)
    .single();
  if (!order) return null;

  const { data: point } = await db.rpc("order_latest_lnglat", { p_order_id: orderId }).maybeSingle();
  const items = (order.order_items as unknown as { qty: number; name_snapshot: string }[] | null) ?? [];

  return {
    orderNumber: order.order_number,
    beachName: (order.beaches as unknown as { name: string } | null)?.name ?? null,
    items: items.map((i) => ({ qty: i.qty, name: i.name_snapshot })),
    totalCents: order.total_cents,
    currency: order.currency,
    cashDue: order.payment_status === "CASH_DUE",
    contactName: order.contact_name,
    contactPhone: order.contact_phone,
    landmarkText: order.landmark_text,
    customerDescription: order.customer_description,
    location: point ? { lat: point.lat, lng: point.lng, accuracyM: point.accuracy_m } : null,
    scheduledFor: order.scheduled_for,
  };
}

export async function notifyTeamOfNewOrder(orderId: string): Promise<void> {
  try {
    const order = await loadNewOrderAlert(orderId);
    if (!order) return;
    const text = buildNewOrderText(order);

    const webhook = process.env.ORDER_ALERT_WEBHOOK_URL;
    const emails = (process.env.ORDER_ALERT_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (!webhook && (emails.length === 0 || !isEmailConfigured())) {
      console.warn(`[team alert] no ORDER_ALERT_WEBHOOK_URL / ORDER_ALERT_EMAILS configured — nobody was told about order #${order.orderNumber}`);
      return;
    }

    const sends: Promise<unknown>[] = [];
    if (webhook) {
      sends.push(
        fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: AbortSignal.timeout(5_000),
        }).then((res) => {
          if (!res.ok) console.error(`[team alert] webhook returned ${res.status}`);
        }),
      );
    }
    if (emails.length > 0 && isEmailConfigured()) {
      const subject = `${brand.name} — NEW ORDER #${order.orderNumber}${order.cashDue ? " (cash)" : ""}`;
      sends.push(
        sendEmail(emails, { subject, html: textToHtml(text) }).then((r) => {
          if (!r.ok) console.error(`[team alert] email failed: ${r.error}`);
        }),
      );
    }
    await Promise.allSettled(sends);
  } catch (err) {
    console.error("[team alert] failed", err);
  }
}
