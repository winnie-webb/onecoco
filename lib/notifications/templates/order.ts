import { brand } from "@/lib/brand";

export interface EmailContent {
  subject: string;
  html: string;
}

export function orderConfirmationEmail(data: {
  orderNumber: number;
  totalCents: number;
  trackUrl?: string;
  awaitingPayment?: boolean;
}): EmailContent {
  const total = `US$${(data.totalCents / 100).toFixed(2)}`;
  const track = data.trackUrl
    ? `<p><a href="${data.trackUrl}">Track your order</a> — keep this email, it's the way back if you close the page.</p>`
    : "<p>Track it any time from the link on your confirmation page.</p>";
  if (data.awaitingPayment) {
    return {
      subject: `${brand.name} — order #${data.orderNumber} received`,
      html: `<p>We've got your order #${data.orderNumber} for ${total}. As soon as your payment goes through we'll send a runner — you'll get another email when it does.</p>${track}`,
    };
  }
  return {
    subject: `${brand.name} — order #${data.orderNumber} confirmed`,
    html: `<p>Thanks — we've got your order #${data.orderNumber} for ${total}.</p>${track}`,
  };
}

export function paymentConfirmationEmail(data: { orderNumber: number }): EmailContent {
  return {
    subject: `${brand.name} — payment received for order #${data.orderNumber}`,
    html: `<p>Payment received for order #${data.orderNumber}. We're on it.</p>`,
  };
}

export function orderDeliveredEmail(data: { orderNumber: number; totalCents: number }): EmailContent {
  const total = `US$${(data.totalCents / 100).toFixed(2)}`;
  return {
    subject: `${brand.name} — order #${data.orderNumber} delivered`,
    html: `<p>Your order #${data.orderNumber} has been delivered. Enjoy your coco!</p><p>Total: ${total}. Keep this email as your receipt.</p><p>Something not right? Reply to this email or message us — we read everything.</p>`,
  };
}

export function orderExpiredEmail(data: { orderNumber: number; refunded: boolean; wasCard: boolean }): EmailContent {
  const money = data.refunded
    ? "Your payment has been refunded in full. Card refunds usually show within 3–5 business days."
    : data.wasCard
      ? "We're refunding your payment now and will email you if anything holds it up."
      : "You haven't been charged.";
  return {
    subject: `${brand.name} — sorry, we couldn't deliver order #${data.orderNumber}`,
    html: `<p>Sorry — no runner was free to take order #${data.orderNumber} in time, so we've cancelled it.</p><p>${money}</p>`,
  };
}
