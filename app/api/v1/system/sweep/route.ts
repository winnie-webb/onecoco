import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/client";
import { createOffersForOrder } from "@/lib/dispatch/offers";
import { expireStaleOrders } from "@/lib/orders/expire";
import { alert } from "@/lib/monitoring/alert";

export const dynamic = "force-dynamic";

/**
 * Phase 10 pilot hardening. No pg_cron/job runner exists in this stack, so
 * this is the one endpoint a scheduler calls (`vercel.json`'s cron entry,
 * which sends `Authorization: Bearer $CRON_SECRET` automatically — a
 * manual call needs the same header). Closes two gaps flagged as "Phase 10
 * additions" in earlier phase notes:
 *
 * 1. Promote scheduled group orders (§9) once their time arrives —
 *    `promote_scheduled_orders()` (migration 0020) flips PLACED →
 *    AWAITING_RUNNER the same way `createOrder()` does for a
 *    dispatchable-now cash order, then this route creates their offers —
 *    the DB function can't call application code, so that step happens
 *    here, immediately after, same as `createOrder()`'s own two-step.
 * 2. Truncate stale exact locations to zone level (§17) —
 *    `truncate_stale_order_locations()` (migration 0020).
 * 3. Expire orders no runner accepted, refunding card payments, and clear
 *    abandoned unpaid checkouts — `expireStaleOrders()` (audit T-4).
 * 4. Prune old rate-limit counters (audit T-9).
 */
export async function POST(request: Request) {
  return sweep(request);
}

// Vercel Cron invokes its path with GET — without this the scheduled sweep
// 405s and never runs. Same bearer check either way.
export async function GET(request: Request) {
  return sweep(request);
}

async function sweep(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = serviceClient();

  const { data: promotedIds, error: promoteError } = await db.rpc("promote_scheduled_orders");
  if (promoteError) {
    await alert(`Sweep failed promoting scheduled orders: ${promoteError.message}`);
    return NextResponse.json({ error: promoteError.message }, { status: 500 });
  }

  let offersCreated = 0;
  for (const orderId of promotedIds ?? []) {
    offersCreated += await createOffersForOrder(orderId as string);
  }

  const { data: truncatedCount, error: truncateError } = await db.rpc("truncate_stale_order_locations");
  if (truncateError) {
    await alert(`Sweep failed truncating stale locations: ${truncateError.message}`);
    return NextResponse.json({ error: truncateError.message }, { status: 500 });
  }

  // Each failed refund has already alerted and is in audit_log as REFUND_FAILED.
  const expiry = await expireStaleOrders();

  // Finished rate-limit windows (migration 0021). Non-critical: a failure
  // here only leaves a few extra rows, so it doesn't fail the sweep.
  const { data: rateLimitRowsPruned } = await db.rpc("prune_rate_limits");

  return NextResponse.json({
    ordersPromoted: (promotedIds ?? []).length,
    offersCreated,
    locationsTruncated: truncatedCount ?? 0,
    ordersExpired: expiry.expired,
    ordersRefunded: expiry.refunded,
    refundFailures: expiry.refundFailures,
    abandonedUnpaidExpired: expiry.abandonedUnpaid,
    rateLimitRowsPruned: rateLimitRowsPruned ?? 0,
  });
}
