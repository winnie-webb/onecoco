import type { Database } from "@/lib/db/types";

/**
 * §5: three orthogonal tracks, each with its own guarded server-side
 * transition. This is the ONLY definition of legal moves — the frontend
 * imports the types below and never hardcodes a status string (README
 * convention). A transition not listed here is illegal and must be rejected
 * by `assertTransition` before any UPDATE is attempted.
 */

export type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PrepStatus = Database["public"]["Enums"]["prep_status"];

export const ALLOWED_FULFILLMENT: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PLACED: ["AWAITING_RUNNER", "CANCELLED", "EXPIRED"],
  AWAITING_RUNNER: ["ASSIGNED", "EXPIRED", "CANCELLED"],
  ASSIGNED: ["OUT_FOR_DELIVERY", "AWAITING_RUNNER", "CANCELLED"], // AWAITING_RUNNER: runner dropped, re-offered
  OUT_FOR_DELIVERY: ["DELIVERED", "UNDELIVERABLE", "CANCELLED"],
  UNDELIVERABLE: ["AWAITING_RUNNER", "CANCELLED"], // RETRIED resolution re-enters dispatch
  DELIVERED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const ALLOWED_PAYMENT: Record<PaymentStatus, PaymentStatus[]> = {
  UNPAID: ["AUTHORIZED", "CAPTURED", "FAILED", "VOIDED", "CASH_DUE"],
  AUTHORIZED: ["CAPTURED", "VOIDED", "FAILED"],
  CAPTURED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  CASH_DUE: ["CASH_COLLECTED", "VOIDED"],
  CASH_COLLECTED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  FAILED: [],
  VOIDED: [],
  REFUNDED: [],
};

export const ALLOWED_PREP: Record<PrepStatus, PrepStatus[]> = {
  NOT_STARTED: ["IN_PROGRESS", "FAILED"],
  IN_PROGRESS: ["READY", "FAILED"],
  READY: [],
  FAILED: ["NOT_STARTED"],
};

export class IllegalTransitionError extends Error {
  constructor(track: string, from: string, to: string) {
    super(`illegal ${track} transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

function assertIn<S extends string>(
  track: string,
  allowed: Record<S, S[]>,
  from: S,
  to: S,
): void {
  if (!allowed[from]?.includes(to)) {
    throw new IllegalTransitionError(track, from, to);
  }
}

export function assertFulfillmentTransition(from: FulfillmentStatus, to: FulfillmentStatus): void {
  assertIn("fulfillment", ALLOWED_FULFILLMENT, from, to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  assertIn("payment", ALLOWED_PAYMENT, from, to);
}

export function assertPrepTransition(from: PrepStatus, to: PrepStatus): void {
  assertIn("prep", ALLOWED_PREP, from, to);
}
