import { describe, expect, it } from "vitest";
import { assertFulfillmentTransition, assertPaymentTransition, assertPrepTransition, IllegalTransitionError } from "@/lib/orders/state";

/**
 * §24: "all three transition maps" is one of the things this suite is
 * explicitly supposed to cover. These are the ONLY definition of legal
 * moves (README convention) — if one of these tests breaks because a
 * transition was added or removed, that's the signal to double-check the
 * change was intentional, not a typo in the map.
 */

describe("fulfillment transitions", () => {
  it("allows the happy path", () => {
    expect(() => assertFulfillmentTransition("PLACED", "AWAITING_RUNNER")).not.toThrow();
    expect(() => assertFulfillmentTransition("AWAITING_RUNNER", "ASSIGNED")).not.toThrow();
    expect(() => assertFulfillmentTransition("ASSIGNED", "OUT_FOR_DELIVERY")).not.toThrow();
    expect(() => assertFulfillmentTransition("OUT_FOR_DELIVERY", "DELIVERED")).not.toThrow();
  });

  it("rejects skipping straight from PLACED to DELIVERED", () => {
    expect(() => assertFulfillmentTransition("PLACED", "DELIVERED")).toThrow(IllegalTransitionError);
  });

  it("rejects any move out of a terminal state", () => {
    expect(() => assertFulfillmentTransition("DELIVERED", "CANCELLED")).toThrow(IllegalTransitionError);
    expect(() => assertFulfillmentTransition("CANCELLED", "PLACED")).toThrow(IllegalTransitionError);
    expect(() => assertFulfillmentTransition("EXPIRED", "AWAITING_RUNNER")).toThrow(IllegalTransitionError);
  });

  it("allows a dropped runner to re-enter dispatch", () => {
    expect(() => assertFulfillmentTransition("ASSIGNED", "AWAITING_RUNNER")).not.toThrow();
  });

  it("allows a retried UNDELIVERABLE order back into dispatch", () => {
    expect(() => assertFulfillmentTransition("UNDELIVERABLE", "AWAITING_RUNNER")).not.toThrow();
  });
});

describe("payment transitions", () => {
  it("allows the card happy path", () => {
    expect(() => assertPaymentTransition("UNPAID", "CAPTURED")).not.toThrow();
    expect(() => assertPaymentTransition("CAPTURED", "REFUNDED")).not.toThrow();
  });

  it("allows the cash path straight to CASH_DUE, never through UNPAID->CAPTURED", () => {
    expect(() => assertPaymentTransition("UNPAID", "CASH_DUE")).not.toThrow();
    expect(() => assertPaymentTransition("CASH_DUE", "CASH_COLLECTED")).not.toThrow();
  });

  it("rejects moving out of a terminal payment state", () => {
    expect(() => assertPaymentTransition("REFUNDED", "CAPTURED")).toThrow(IllegalTransitionError);
    expect(() => assertPaymentTransition("VOIDED", "UNPAID")).toThrow(IllegalTransitionError);
  });

  it("allows multiple partial refunds before a final full refund", () => {
    expect(() => assertPaymentTransition("PARTIALLY_REFUNDED", "PARTIALLY_REFUNDED")).not.toThrow();
    expect(() => assertPaymentTransition("PARTIALLY_REFUNDED", "REFUNDED")).not.toThrow();
  });
});

describe("prep transitions", () => {
  it("allows the happy path", () => {
    expect(() => assertPrepTransition("NOT_STARTED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertPrepTransition("IN_PROGRESS", "READY")).not.toThrow();
  });

  it("rejects READY going backwards", () => {
    expect(() => assertPrepTransition("READY", "IN_PROGRESS")).toThrow(IllegalTransitionError);
  });

  it("allows retrying after a prep failure", () => {
    expect(() => assertPrepTransition("FAILED", "NOT_STARTED")).not.toThrow();
  });
});
