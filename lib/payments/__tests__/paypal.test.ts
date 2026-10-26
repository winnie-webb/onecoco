import { describe, expect, it } from "vitest";
import { parseCaptureResponse } from "@/lib/payments/paypal";

/**
 * Pure-logic tests only — no network. `parseCaptureResponse` is the one
 * piece of `lib/payments/paypal.ts` that has actually been exercised; the
 * live HTTP calls (OAuth token, order create/capture/refund, webhook
 * verification) have not, because this environment has neither PayPal
 * sandbox credentials nor network egress to `api-m.sandbox.paypal.com`
 * (confirmed: the agent proxy rejects the CONNECT). See PHASE-5-NOTES.md.
 *
 * The fixture shapes below follow PayPal's documented Orders v2 response
 * schema from training knowledge, not a captured real response — flagged
 * so a future reader doesn't mistake this for a golden-file test recorded
 * against the real API.
 */

const ORDER_ID = "11111111-1111-1111-1111-111111111111";

function fixture(overrides: Partial<{ status: string; captureStatus: string; customId: string; amount: string; currency: string }> = {}) {
  return {
    id: "5O190127TN364715T",
    status: overrides.status ?? "COMPLETED",
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: "3C679366HH908993F",
              status: overrides.captureStatus ?? "COMPLETED",
              amount: { value: overrides.amount ?? "9.00", currency_code: overrides.currency ?? "USD" },
              custom_id: overrides.customId ?? ORDER_ID,
              invoice_id: overrides.customId ?? ORDER_ID,
            },
          ],
        },
      },
    ],
  };
}

describe("parseCaptureResponse (§8's four checks, at the PayPal-mapping layer)", () => {
  it("maps a completed capture matching the expected order to CAPTURED, in integer cents", () => {
    const result = parseCaptureResponse(fixture(), ORDER_ID);
    expect(result).toMatchObject({ status: "CAPTURED", providerCaptureId: "3C679366HH908993F", amountCents: 900 });
  });

  it("check 1 (binding): rejects a custom_id that doesn't match our order — the check implementations skip is amount, but binding matters just as much", () => {
    const result = parseCaptureResponse(fixture({ customId: "some-other-order-id" }), ORDER_ID);
    expect(result.status).toBe("FAILED");
    expect((result as { reason: string }).reason).toContain("custom_id mismatch");
  });

  it("check 3: PENDING is its own outcome, never folded into CAPTURED or FAILED", () => {
    expect(parseCaptureResponse(fixture({ status: "PENDING" }), ORDER_ID).status).toBe("PENDING");
    expect(parseCaptureResponse(fixture({ captureStatus: "PENDING" }), ORDER_ID).status).toBe("PENDING");
  });

  it("rejects a DECLINED capture as FAILED, not CAPTURED", () => {
    const result = parseCaptureResponse(fixture({ captureStatus: "DECLINED" }), ORDER_ID);
    expect(result.status).toBe("FAILED");
  });

  it("rejects an order with no capture at all", () => {
    const result = parseCaptureResponse({ id: "x", status: "COMPLETED" }, ORDER_ID);
    expect(result.status).toBe("FAILED");
  });

  it("converts fractional-cent-looking decimal amounts correctly (no floating-point drift)", () => {
    const result = parseCaptureResponse(fixture({ amount: "12.34" }), ORDER_ID);
    expect(result).toMatchObject({ status: "CAPTURED", amountCents: 1234 });
  });
});
