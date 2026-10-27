import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/client";
import { checkServiceability } from "@/lib/pricing/serviceability";

export const dynamic = "force-dynamic";

/**
 * Beaches we operate (zone OPEN), each with whether it takes orders right
 * now and, if not, why and today's hours. For customers whose GPS fails, is
 * denied, or puts them outside the zone: they pick an open beach and
 * describe where they are instead of being turned away, and a closed one
 * says so plainly ("no runner on the beach yet, 9am–5pm") rather than the
 * page silently showing nothing.
 *
 * `lat`/`lng` is the beach's centre point — used only to price the quote
 * (it must fall inside the zone), never stored as the customer's location.
 */
export async function GET() {
  const db = serviceClient();
  const { data: zones, error } = await db
    .from("delivery_zones")
    .select("*, beaches(name)")
    .eq("active", true)
    .eq("service_status", "OPEN");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const open = [];
  for (const zone of zones ?? []) {
    const { beaches, ...zoneRow } = zone as typeof zone & { beaches: { name: string } | null };
    const serviceability = await checkServiceability(zoneRow);
    const { data: center } = await db.rpc("beach_lnglat", { p_beach_id: zoneRow.beach_id }).maybeSingle();
    if (!center) continue;
    open.push({
      zone: { id: zoneRow.id, name: zoneRow.name, beachName: beaches?.name ?? null, deliveryFeeCents: zoneRow.delivery_fee_cents },
      serviceable: serviceability.serviceable,
      reason: serviceability.serviceable ? null : serviceability.reason,
      hoursToday: serviceability.hoursToday ?? null,
      etaMinMinutes: zoneRow.eta_min_minutes,
      etaMaxMinutes: zoneRow.eta_max_minutes,
      lat: center.lat,
      lng: center.lng,
    });
  }
  return NextResponse.json({ beaches: open });
}
