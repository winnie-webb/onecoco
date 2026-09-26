import { serviceClient } from "@/lib/db/client";
import { assertFulfillmentTransition, assertPaymentTransition, assertPrepTransition } from "@/lib/orders/state";
import { sendNotification } from "@/lib/notifications/transport";

export class RunnerTransitionError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "RunnerTransitionError";
  }
}

export type RunnerAction = "PICKED_UP" | "ARRIVING" | "DELIVERED" | "UNDELIVERABLE";

export interface RunnerTransitionInput {
  orderId: string;
  runnerId: string;
  action: RunnerAction;
  deliveryCode?: string;
  deliveryPhotoUrl?: string;
  occurredAt?: string; // device clock, §12
  reason?: string;
}

async function loadAssignedOrder(runnerId: string, orderId: string) {
  const db = serviceClient();
  const { data: assignment } = await db
    .from("order_assignments")
    .select("id")
    .eq("order_id", orderId)
    .eq("runner_id", runnerId)
    .is("released_at", null)
    .maybeSingle();
  if (!assignment) throw new RunnerTransitionError("this order is not assigned to you", "NOT_ASSIGNED");

  const { data: order, error } = await db
    .from("orders")
    .select("id, fulfillment_status, prep_status, payment_status, delivery_code, total_cents, contact_attempts")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new RunnerTransitionError("order not found", "NOT_FOUND");

  return { assignmentId: assignment.id, order };
}

/**
 * §11's last-20-metres flow, mechanically: PICKED_UP folds prep straight
 * to READY (this MVP has no separate prep-station role — the runner is
 * the one who prepares and delivers, §1 decision 1: "One Coco operates
 * it. Runners are staff"), ARRIVING is an event with no status change
 * (§4.3: "replaces a NEAR_CUSTOMER state... it gates no permission"),
 * DELIVERED checks the customer-shown `delivery_code` and settles cash,
 * UNDELIVERABLE leaves the assignment active for ops to resolve rather
 * than silently dropping it.
 */
export async function applyRunnerTransition(input: RunnerTransitionInput): Promise<void> {
  const db = serviceClient();
  const { assignmentId, order } = await loadAssignedOrder(input.runnerId, input.orderId);

  if (input.action === "PICKED_UP") {
    assertFulfillmentTransition(order.fulfillment_status, "OUT_FOR_DELIVERY");
    assertPrepTransition(order.prep_status, "IN_PROGRESS");
    assertPrepTransition("IN_PROGRESS", "READY");

    const now = new Date().toISOString();
    await db.from("orders").update({ prep_status: "IN_PROGRESS", prep_started_at: now }).eq("id", order.id).eq("prep_status", order.prep_status);
    await db.from("orders").update({ prep_status: "READY", prep_ready_at: now }).eq("id", order.id).eq("prep_status", "IN_PROGRESS");
    await db
      .from("orders")
      .update({ fulfillment_status: "OUT_FOR_DELIVERY" })
      .eq("id", order.id)
      .eq("fulfillment_status", order.fulfillment_status);
    await db.from("order_assignments").update({ picked_up_at: now }).eq("id", assignmentId);
    return;
  }

  if (input.action === "ARRIVING") {
    if (order.fulfillment_status !== "OUT_FOR_DELIVERY") {
      throw new RunnerTransitionError("order is not out for delivery", "WRONG_STATE");
    }
    await db.from("orders").update({ arriving_announced_at: new Date().toISOString() }).eq("id", order.id);
    return;
  }

  if (input.action === "DELIVERED") {
    if (order.fulfillment_status !== "OUT_FOR_DELIVERY") {
      throw new RunnerTransitionError("order is not out for delivery", "WRONG_STATE");
    }
    if (input.deliveryCode !== order.delivery_code) {
      throw new RunnerTransitionError("delivery code does not match", "CODE_MISMATCH");
    }

    assertFulfillmentTransition("OUT_FOR_DELIVERY", "DELIVERED");
    const now = new Date().toISOString();

    await db
      .from("orders")
      .update({ fulfillment_status: "DELIVERED", delivered_at: now, delivery_photo_url: input.deliveryPhotoUrl ?? null })
      .eq("id", order.id)
      .eq("fulfillment_status", "OUT_FOR_DELIVERY");

    await db
      .from("order_assignments")
      .update({ released_at: now, release_reason: "COMPLETED", delivered_occurred_at: input.occurredAt ?? now, delivered_recorded_at: now })
      .eq("id", assignmentId);

    // §17's "short retention": the delivery is over, so the GPS trail
    // collected for it is deleted immediately rather than lingering on a
    // cleanup schedule that may not exist yet.
    await db.from("runner_locations").delete().eq("assignment_id", assignmentId);

    if (order.payment_status === "CASH_DUE") {
      assertPaymentTransition("CASH_DUE", "CASH_COLLECTED");
      await db
        .from("orders")
        .update({ payment_status: "CASH_COLLECTED", cash_collected_cents: order.total_cents, collected_by_runner_id: input.runnerId })
        .eq("id", order.id)
        .eq("payment_status", "CASH_DUE");

      const { data: openShift } = await db
        .from("shifts")
        .select("id")
        .eq("runner_id", input.runnerId)
        .is("ended_at", null)
        .maybeSingle();
      if (openShift) {
        const { data: cash } = await db.from("shift_cash").select("collected_cents").eq("shift_id", openShift.id).maybeSingle();
        if (cash) {
          await db.from("shift_cash").update({ collected_cents: cash.collected_cents + order.total_cents }).eq("shift_id", openShift.id);
        } else {
          await db.from("shift_cash").insert({ shift_id: openShift.id, collected_cents: order.total_cents });
        }
      }
    }

    const { data: fresh } = await db.from("orders").select("contact_email, order_number").eq("id", order.id).single();
    if (fresh) {
      await sendNotification({ orderId: order.id, channel: "EMAIL", template: "order_confirmation", recipient: fresh.contact_email ?? "", data: { orderNumber: fresh.order_number } });
    }
    return;
  }

  if (input.action === "UNDELIVERABLE") {
    if (order.fulfillment_status !== "OUT_FOR_DELIVERY") {
      throw new RunnerTransitionError("order is not out for delivery", "WRONG_STATE");
    }
    assertFulfillmentTransition("OUT_FOR_DELIVERY", "UNDELIVERABLE");
    await db
      .from("orders")
      .update({
        fulfillment_status: "UNDELIVERABLE",
        contact_attempts: order.contact_attempts + 1,
        // Reusing `cancellation_reason` — the schema has no dedicated
        // "why undeliverable" column, only `undeliverable_resolution`
        // (RETRIED/REFUNDED/FORFEITED/DISPOSED), which is ops' eventual
        // decision, not the runner's account of what happened.
        cancellation_reason: input.reason ?? null,
      })
      .eq("id", order.id)
      .eq("fulfillment_status", "OUT_FOR_DELIVERY");
    // Assignment is deliberately left active (released_at IS NULL) —
    // resolution (RETRIED/REFUNDED/FORFEITED/DISPOSED, §5) is an ops call,
    // not a fact the runner can decide alone.
    return;
  }
}
