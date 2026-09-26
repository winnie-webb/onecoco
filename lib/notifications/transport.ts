import { serviceClient } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";

type NotificationChannel = Database["public"]["Enums"]["notification_channel"];

/**
 * §22: "Resend (or similar) — Transactional email — Mockable? Yes — console
 * sink." No account yet, so this writes the attempt to `notifications` (the
 * real record ops needs) and logs it — never throws, since a failed
 * notification must never fail the order it's attached to.
 */
export async function sendNotification(args: {
  orderId: string;
  channel: NotificationChannel;
  template: string;
  recipient: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  console.info(`[notification console-sink] ${args.channel}/${args.template} -> ${args.recipient}`, args.data ?? {});

  try {
    await serviceClient().from("notifications").insert({
      order_id: args.orderId,
      channel: args.channel,
      template: args.template,
      recipient: args.recipient,
      status: "SENT", // console sink "sends" instantly; a real provider would start PENDING
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("failed to record notification", err);
  }
}
