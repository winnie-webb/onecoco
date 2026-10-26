import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";
import { mapsUrl } from "@/lib/notifications/team";

export const dynamic = "force-dynamic";

/** Opens the customer's latest GPS point in Google Maps — the board links
 * here so the coordinates never have to be shipped to the browser list. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  const { data: point } = await serviceClient().rpc("order_latest_lnglat", { p_order_id: id }).maybeSingle();
  if (!point) {
    return new NextResponse("No GPS location for this order — use the landmark and call the customer.", { status: 404 });
  }
  return NextResponse.redirect(mapsUrl(point.lat, point.lng));
}
