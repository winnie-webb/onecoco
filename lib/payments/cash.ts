import crypto from "node:crypto";
import type { CaptureOutcome, PaymentProvider, RefundArgs, RefundOutcome, StartArgs, StartResult } from "./index";

/**
 * §8: "cash (runner-settled)". Cash is the one path that never calls
 * `capture()` through the normal API route — `lib/orders/create.ts` sets
 * `payment_status = CASH_DUE` directly at order creation (§4.3: cash has no
 * valid entry through PAID at all), and the runner app (Phase 6) records
 * `cash_collected_cents` at handover. This provider exists so order code
 * still never names "cash" as a special case — it just asks for a provider.
 */
export const cashProvider: PaymentProvider = {
  name: "cash",

  isConfigured() {
    return true;
  },

  environment() {
    return "live";
  },

  async start(args: StartArgs): Promise<StartResult> {
    return { providerRef: `cash_${args.orderId}` };
  },

  async capture(): Promise<CaptureOutcome> {
    // Nothing to capture electronically — collection happens physically at
    // delivery (Phase 6). Reported PENDING, never CAPTURED, so nothing
    // mistakes a cash order for a charged one before the runner has the cash.
    return { status: "PENDING", raw: { cash: true } };
  },

  async refund(args: RefundArgs): Promise<RefundOutcome> {
    // A cash refund is a human handing money back, not an API call — this
    // only records that a refund was decided; ops still enacts it manually.
    return {
      status: "SUCCEEDED",
      providerRefundId: `cashref_${crypto.randomBytes(8).toString("hex")}`,
      raw: { cash: true, amountCents: args.amountCents },
    };
  },
};
