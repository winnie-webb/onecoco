import { afterEach, describe, expect, it, vi } from "vitest";
import { cardProvider } from "@/lib/payments/availability";

afterEach(() => vi.unstubAllEnvs());

describe("cardProvider", () => {
  it("offers PayPal whenever it is configured", () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "id");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "secret");
    vi.stubEnv("NODE_ENV", "production");
    expect(cardProvider()).toBe("paypal");
  });

  it("falls back to the mock provider outside production", () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(cardProvider()).toBe("mock");
  });

  it("never offers the mock provider in production — cash only", () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(cardProvider()).toBeNull();
  });
});
