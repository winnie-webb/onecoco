import { serviceClient } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";
import { isEmailConfigured, sendEmail } from "@/lib/notifications/email";
import { orderConfirmationEmail, paymentConfirmationEmail } from "@/lib/notifications/templates/order";

type NotificationChannel = Database["public"]["Enums"]["notification_channel"];

const TEMPLATES: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  order_confirmation: (data) => orderConfirmationEmail({ orderNumber: data.orderNumber as number, totalCents: data.totalCents as number }),
  payment_confirmation: (data) => paymentConfirmationEmail({ orderNumber: data.orderNumber as number }),
};

/**
 * §22: "Resend (or similar) — Transactional email — Mockable? Yes —
 * console sink." Sends for real when `RESEND_API_KEY`/`RESEND_FROM` are
 * set (unverified against a live account in this sandbox — see
 * lib/notifications/email.ts); otherwise console-sinks, which is the
 * honest current state. Never throws either way — a failed notification
 * must never fail the order it's attached to.
 */
export async function sendNotification(args: {
  orderId: string;
  channel: NotificationChannel;
  template: string;
  recipient: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  let status: string = "SENT";
  let providerRef: string | null = null;
  let error: string | null = null;

  if (args.channel === "EMAIL" && isEmailConfigured() && TEMPLATES[args.template]) {
    const content = TEMPLATES[args.template](args.data ?? {});
    const result = await sendEmail(args.recipient, content);
    status = result.ok ? "SENT" : "FAILED";
    providerRef = result.providerRef ?? null;
    error = result.error ?? null;
    if (!result.ok) console.error(`[email send failed] ${args.template} -> ${args.recipient}: ${result.error}`);
  } else {
    console.info(`[notification console-sink] ${args.channel}/${args.template} -> ${args.recipient}`, args.data ?? {});
  }

  try {
    await serviceClient().from("notifications").insert({
      order_id: args.orderId,
      channel: args.channel,
      template: args.template,
      recipient: args.recipient,
      status,
      provider_ref: providerRef,
      error,
      sent_at: status === "SENT" ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("failed to record notification", err);
  }
}
