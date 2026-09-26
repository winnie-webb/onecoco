import type { FulfillmentStatus } from "@/lib/orders/state";

/**
 * The one place fulfillment-status copy lives. Frontend components import
 * this map (or the `FulfillmentStatus` type) and never write a raw status
 * string into JSX (README convention) — a status the backend adds later
 * fails a type check here instead of silently rendering blank.
 */
export const FULFILLMENT_COPY: Record<FulfillmentStatus, string> = {
  PLACED: "Order placed",
  AWAITING_RUNNER: "Looking for a runner",
  ASSIGNED: "A runner has your order",
  OUT_FOR_DELIVERY: "On the way",
  DELIVERED: "Delivered",
  UNDELIVERABLE: "We couldn't find you",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};
