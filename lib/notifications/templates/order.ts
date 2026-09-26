import { brand } from "@/lib/brand";

export interface EmailContent {
  subject: string;
  html: string;
}

export function orderConfirmationEmail(data: { orderNumber: number; totalCents: number }): EmailContent {
  const total = `US$${(data.totalCents / 100).toFixed(2)}`;
  return {
    subject: `${brand.name} — order #${data.orderNumber} confirmed`,
    html: `<p>Thanks — we've got your order #${data.orderNumber} for ${total}.</p><p>Track it any time from the link in your confirmation page.</p>`,
  };
}

export function paymentConfirmationEmail(data: { orderNumber: number }): EmailContent {
  return {
    subject: `${brand.name} — payment received for order #${data.orderNumber}`,
    html: `<p>Payment received for order #${data.orderNumber}. We're on it.</p>`,
  };
}
