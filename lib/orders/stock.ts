import { serviceClient } from "@/lib/db/client";
import { alert } from "@/lib/monitoring/alert";

/**
 * Stock counted in coconuts (migration 0022). Reserved when an order is
 * created — card orders included, so two customers can't both pay for the
 * last coconut — and released if the order never gets delivered:
 * cancelled, expired, abandoned at checkout or payment failed.
 */
export async function reserveOrderStock(orderId: string): Promise<boolean> {
  const { data, error } = await serviceClient().rpc("reserve_order_stock", { p_order_id: orderId });
  if (error) throw new Error(`stock reservation failed: ${error.message}`);
  return data === true;
}

/** Never throws: a stock count that's one too low must not block a cancel or
 * refund. Ops are alerted instead and can fix the count in /admin/products. */
export async function releaseOrderStock(orderId: string): Promise<void> {
  const { error } = await serviceClient().rpc("release_order_stock", { p_order_id: orderId });
  if (error) await alert(`Could not put stock back for order ${orderId}: ${error.message}`);
}
