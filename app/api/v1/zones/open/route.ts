import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/client";
import { checkServiceability } from "@/lib/pricing/serviceability";

export const dynamic = "force-dynamic";

/**
 * Beaches taking orders right now, for customers whose GPS fails, is
 * denied, or puts them just outside the zone. They pick the beach and
 * describe where they are instead of being turned away.
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
    if (!serviceability.serviceable) continue;
    const { data: center } = await db.rpc("beach_lnglat", { p_beach_id: zoneRow.beach_id }).maybeSingle();
    if (!center) continue;
    open.push({
      zone: { id: zoneRow.id, name: zoneRow.name, beachName: beaches?.name ?? null, deliveryFeeCents: zoneRow.delivery_fee_cents },
      etaMinMinutes: zoneRow.eta_min_minutes,
      etaMaxMinutes: zoneRow.eta_max_minutes,
      lat: center.lat,
      lng: center.lng,
    });
  }
  return NextResponse.json({ beaches: open });
}
