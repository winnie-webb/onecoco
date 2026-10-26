import { describe, expect, it } from "vitest";
import { buildNewOrderText, mapsUrl, type NewOrderAlert } from "@/lib/notifications/team";

const base: NewOrderAlert = {
  orderNumber: 1042,
  beachName: "Harmony Beach Park",
  items: [{ qty: 2, name: "Classic Coco" }],
  totalCents: 1600,
  currency: "USD",
  cashDue: false,
  contactName: "Sam",
  contactPhone: "+1 555 0100",
  landmarkText: "blue umbrella by the lifeguard tower",
  customerDescription: "red hat",
  location: { lat: 18.47631, lng: -77.92591, accuracyM: 12.4 },
  scheduledFor: null,
};

describe("new-order team alert", () => {
  it("leads with the order and beach so a phone notification preview is enough", () => {
    expect(buildNewOrderText(base).split("\n")[0]).toBe("🥥 New order #1042 — Harmony Beach Park");
  });

  it("gives the runner everything needed to find the customer", () => {
    const text = buildNewOrderText(base);
    expect(text).toContain("2× Classic Coco");
    expect(text).toContain("Sam, +1 555 0100");
    expect(text).toContain("Landmark: blue umbrella by the lifeguard tower");
    expect(text).toContain("Look for: red hat");
    expect(text).toContain("https://www.google.com/maps/search/?api=1&query=18.476310,-77.925910 (GPS ±12m)");
  });

  it("says whether to collect cash", () => {
    expect(buildNewOrderText(base)).toContain("PAID by card: US$16.00");
    expect(buildNewOrderText({ ...base, cashDue: true })).toContain("COLLECT CASH: US$16.00");
  });

  it("says plainly when there is no GPS point", () => {
    expect(buildNewOrderText({ ...base, location: null })).toContain("no GPS fix");
  });

  it("builds a Google Maps search link", () => {
    expect(mapsUrl(18.4763, -77.9259)).toBe("https://www.google.com/maps/search/?api=1&query=18.476300,-77.925900");
  });
});
