import crypto from "node:crypto";
import type { CaptureArgs, CaptureOutcome, PaymentProvider, RefundArgs, RefundOutcome, StartArgs, StartResult } from "./index";

/**
 * §8: "mock (dev only, hard-disabled in production)". Simulates PayPal's
 * shape (start = authorise, capture = separate server call) without a
 * redirect, so the same order/payment code path exercises the real
 * consistency rules (§8's four checks) before Phase 5 swaps in real PayPal.
 */
function assertNotProduction(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("the mock payment provider is hard-disabled in production");
  }
}

export const mockProvider: PaymentProvider = {
  name: "mock",

  isConfigured() {
    return process.env.NODE_ENV !== "production";
  },

  environment() {
    return "sandbox";
  },

  async start(args: StartArgs): Promise<StartResult> {
    assertNotProduction();
    return { providerRef: `mock_${args.orderId}_${crypto.randomBytes(6).toString("hex")}` };
  },

  async capture(args: CaptureArgs): Promise<CaptureOutcome> {
    assertNotProduction();
    // The mock always "succeeds" for the exact amount it was started with —
    // it has no independent ledger to disagree with us, unlike a real
    // provider. The four checks in the capture route run regardless, so an
    // underpaid capture is still rejected structurally even though this
    // provider can't itself produce one.
    return {
      status: "CAPTURED",
      providerCaptureId: `mockcap_${crypto.randomBytes(8).toString("hex")}`,
      amountCents: args.expectedCents,
      raw: { mock: true, providerRef: args.providerRef },
    };
  },

  async refund(args: RefundArgs): Promise<RefundOutcome> {
    assertNotProduction();
    return {
      status: "SUCCEEDED",
      providerRefundId: `mockref_${crypto.randomBytes(8).toString("hex")}`,
      raw: { mock: true, amountCents: args.amountCents },
    };
  },
};
