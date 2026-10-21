import { describe, expect, it } from "vitest";
import { orderConfirmationEmail, orderDeliveredEmail, orderExpiredEmail } from "@/lib/notifications/templates/order";

describe("order email templates", () => {
  it("puts the tracking link in the confirmation email when given", () => {
    const email = orderConfirmationEmail({ orderNumber: 1001, totalCents: 900, trackUrl: "https://x.test/track/abc" });
    expect(email.html).toContain('href="https://x.test/track/abc"');
  });

  it("sends a receipt, not a confirmation, on delivery", () => {
    const email = orderDeliveredEmail({ orderNumber: 1001, totalCents: 1200 });
    expect(email.subject).toContain("delivered");
    expect(email.html).toContain("US$12.00");
  });

  it("tells an expired customer exactly what happened to their money", () => {
    expect(orderExpiredEmail({ orderNumber: 1, refunded: true, wasCard: true }).html).toContain("refunded in full");
    expect(orderExpiredEmail({ orderNumber: 1, refunded: false, wasCard: true }).html).toContain("refunding your payment now");
    expect(orderExpiredEmail({ orderNumber: 1, refunded: false, wasCard: false }).html).toContain("haven't been charged");
  });
});
