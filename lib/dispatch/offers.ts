import { serviceClient } from "@/lib/db/client";
import { getSettings } from "@/lib/settings";
import { notifyTeamOfNewOrder } from "@/lib/notifications/team";

/**
 * An order just became deliverable (AWAITING_RUNNER): offer it to the
 * runners on shift and tell the team. Called from the three places that
 * transition happens — cash order creation (lib/orders/create.ts), card
 * capture (lib/payments/verify.ts) and scheduled-order promotion (the sweep).
 */
export async function dispatchOrder(orderId: string): Promise<number> {
  const offers = await createOffersForOrder(orderId);
  await notifyTeamOfNewOrder(orderId);
  return offers;
}

/**
 * §6 step 1: "Order becomes dispatchable → an order_offers row per
 * available runner on that beach, with expires_at."
 *
 * Offers stay open until the sweep would expire the order (accept deadline
 * + grace), not just the accept window: a runner who opens the app late
 * can still take an order that hasn't been refunded yet.
 */
export async function createOffersForOrder(orderId: string): Promise<number> {
  const db = serviceClient();

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("beach_id, accept_deadline_at")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new Error(`order not found for dispatch: ${orderId}`);

  const { data: runners, error: runnersError } = await db
    .from("runners")
    .select("id")
    .eq("home_beach_id", order.beach_id)
    .eq("active", true)
    .eq("shift_status", "AVAILABLE");
  if (runnersError) throw new Error(`runner lookup failed: ${runnersError.message}`);
  if (!runners || runners.length === 0) return 0;

  return insertOffers(
    runners.map((r) => r.id),
    [{ id: orderId, accept_deadline_at: order.accept_deadline_at }],
  );
}

/**
 * A runner just started their shift: offer them every order at their beach
 * that is still waiting. Without this, an order paid before anyone was on
 * shift was never offered to anyone and sat until the sweep refunded it.
 */
export async function offerWaitingOrdersToRunner(runnerId: string, beachId: string): Promise<number> {
  const db = serviceClient();
  const { data: waiting, error } = await db
    .from("orders")
    .select("id, accept_deadline_at")
    .eq("beach_id", beachId)
    .eq("fulfillment_status", "AWAITING_RUNNER")
    .is("cancelled_at", null);
  if (error) throw new Error(`waiting-order lookup failed: ${error.message}`);
  if (!waiting || waiting.length === 0) return 0;
  return insertOffers([runnerId], waiting);
}

async function insertOffers(runnerIds: string[], orders: { id: string; accept_deadline_at: string | null }[]): Promise<number> {
  const { expiryGraceMinutes, acceptWindowMinutes } = await getSettings();
  const rows = orders.flatMap((o) => {
    const deadline = o.accept_deadline_at ? new Date(o.accept_deadline_at).getTime() : Date.now() + acceptWindowMinutes * 60_000;
    const expiresAt = new Date(Math.max(deadline, Date.now()) + expiryGraceMinutes * 60_000).toISOString();
    return runnerIds.map((runnerId) => ({ order_id: o.id, runner_id: runnerId, expires_at: expiresAt }));
  });

  // UNIQUE (order_id, runner_id): skip pairs that already have an offer
  // rather than failing the whole batch (a plain insert aborted every row
  // when any one of them already existed).
  const { error } = await serviceClient()
    .from("order_offers")
    .upsert(rows, { onConflict: "order_id,runner_id", ignoreDuplicates: true });
  if (error) throw new Error(`offer creation failed: ${error.message}`);
  return rows.length;
}
