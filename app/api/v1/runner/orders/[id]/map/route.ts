import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";
import { mapsUrl } from "@/lib/notifications/team";

export const dynamic = "force-dynamic";

/** Opens the customer's latest GPS point in Google Maps, for the runner the
 * order is actively assigned to (same rule as the delivery page's RLS). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  const db = serviceClient();
  const { data: assignment } = await db
    .from("order_assignments")
    .select("id")
    .eq("order_id", id)
    .eq("runner_id", guard.session.runnerId)
    .is("released_at", null)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ error: "this order is not assigned to you" }, { status: 403 });

  const { data: point } = await db.rpc("order_latest_lnglat", { p_order_id: id }).maybeSingle();
  if (!point) {
    return new NextResponse("No GPS location for this order — use the landmark and call the customer.", { status: 404 });
  }
  return NextResponse.redirect(mapsUrl(point.lat, point.lng));
}
