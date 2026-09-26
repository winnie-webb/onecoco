import { serviceClient } from "@/lib/db/client";
import { getSettings } from "@/lib/settings";

/**
 * §6 step 1: "Order becomes dispatchable → an order_offers row per
 * available runner on that beach, with expires_at." Called right after an
 * order transitions to AWAITING_RUNNER — from the mock/PayPal capture
 * success path (lib/payments/verify.ts) and the cash order-creation path
 * (lib/orders/create.ts), the only two places that transition currently
 * happens.
 */
export async function createOffersForOrder(orderId: string): Promise<number> {
  const db = serviceClient();

  const { data: order, error: orderError } = await db.from("orders").select("beach_id").eq("id", orderId).single();
  if (orderError || !order) throw new Error(`order not found for dispatch: ${orderId}`);

  const { data: runners, error: runnersError } = await db
    .from("runners")
    .select("id")
    .eq("home_beach_id", order.beach_id)
    .eq("active", true)
    .eq("shift_status", "AVAILABLE");
  if (runnersError) throw new Error(`runner lookup failed: ${runnersError.message}`);
  if (!runners || runners.length === 0) return 0;

  const settings = await getSettings();
  const expiresAt = new Date(Date.now() + settings.acceptWindowMinutes * 60_000).toISOString();

  const { error: insertError } = await db.from("order_offers").insert(
    runners.map((r) => ({ order_id: orderId, runner_id: r.id, expires_at: expiresAt })),
  );
  // UNIQUE (order_id, runner_id) — re-dispatching an order that already has
  // open offers for these runners is a no-op, not an error.
  if (insertError && insertError.code !== "23505") throw new Error(`offer creation failed: ${insertError.message}`);

  return runners.length;
}
