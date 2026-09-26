/**
 * §8: the interface that makes PayPal → Stripe (Phase 5+) a swap, not a
 * rewrite. Order code never names a provider directly — it asks this module
 * for one by name.
 */

export type PaymentEnvironment = "sandbox" | "live";

export interface StartArgs {
  orderId: string;
  amountCents: number;
  currency: string;
}

export interface StartResult {
  providerRef: string;
  /** Present for redirect-based providers (PayPal). Absent for mock/cash. */
  redirectUrl?: string;
}

export interface CaptureArgs {
  providerRef: string;
  expectedOrderId: string;
  expectedCents: number;
  currency: string;
}

export type CaptureOutcome =
  | { status: "CAPTURED"; providerCaptureId: string; amountCents: number; raw: unknown }
  | { status: "PENDING"; raw: unknown }
  | { status: "FAILED"; reason: string; raw: unknown };

export interface RefundArgs {
  providerCaptureId: string;
  amountCents: number;
  currency: string;
  reason?: string;
}

export type RefundOutcome =
  | { status: "SUCCEEDED"; providerRefundId: string; raw: unknown }
  | { status: "FAILED"; reason: string; raw: unknown };

export interface PaymentProvider {
  name: string;
  isConfigured(): boolean;
  environment(): PaymentEnvironment;
  start(args: StartArgs): Promise<StartResult>;
  capture(args: CaptureArgs): Promise<CaptureOutcome>;
  refund(args: RefundArgs): Promise<RefundOutcome>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(name: string) {
    super(`payment provider "${name}" is not configured`);
    this.name = "ProviderNotConfiguredError";
  }
}

export async function getProvider(name: string): Promise<PaymentProvider> {
  switch (name) {
    case "mock": {
      const { mockProvider } = await import("./mock");
      return mockProvider;
    }
    case "cash": {
      const { cashProvider } = await import("./cash");
      return cashProvider;
    }
    case "paypal": {
      const { paypalProvider } = await import("./paypal");
      if (!paypalProvider.isConfigured()) throw new ProviderNotConfiguredError("paypal");
      return paypalProvider;
    }
    case "stripe":
      throw new ProviderNotConfiguredError("stripe"); // Phase 5+
    default:
      throw new Error(`unknown payment provider "${name}"`);
  }
}
