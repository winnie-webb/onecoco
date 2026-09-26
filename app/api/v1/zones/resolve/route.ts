import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/client";
import { resolveZone } from "@/lib/geo/zones";
import { checkServiceability } from "@/lib/pricing/serviceability";
import { computeEta } from "@/lib/pricing/eta";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface ResolveBody {
  lat?: unknown;
  lng?: unknown;
  accuracyM?: unknown;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * §13: lat/lng + accuracy → zone, serviceability, fee, ETA range.
 *
 * The client never sends a price and never decides serviceability itself —
 * this is the one place that gate runs, matching §7.
 */
export async function POST(request: Request) {
  let body: ResolveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { lat, lng, accuracyM } = body;
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "lat/lng must be finite numbers in range" }, { status: 400 });
  }
  const accuracy = isFiniteNumber(accuracyM) ? accuracyM : null;

  const settings = await getSettings();

  try {
    const match = await resolveZone(lng, lat, settings.zoneBufferMetres);

    if (match.kind === "none") {
      return NextResponse.json({ match: "none", serviceable: false, reason: "OUT_OF_ZONE" });
    }

    const db = serviceClient();
    const { data: beach } = await db.from("beaches").select("name").eq("id", match.zone.beach_id).single();

    const lowAccuracy = accuracy != null && accuracy > settings.accuracyThresholdM;

    if (match.kind === "borderline") {
      return NextResponse.json({
        match: "borderline",
        serviceable: false,
        reason: "BORDERLINE_UNCONFIRMED",
        lowAccuracy,
        zone: { name: match.zone.name, beachName: beach?.name ?? null },
      });
    }

    const zone = match.zone;
    const serviceability = await checkServiceability(zone);

    const base = {
      match: "covered" as const,
      lowAccuracy,
      zone: {
        id: zone.id,
        name: zone.name,
        beachName: beach?.name ?? null,
        deliveryFeeCents: zone.delivery_fee_cents,
      },
    };

    if (!serviceability.serviceable) {
      return NextResponse.json({ ...base, serviceable: false, reason: serviceability.reason });
    }

    const eta = await computeEta(zone, lng, lat, settings);
    return NextResponse.json({
      ...base,
      serviceable: true,
      etaMinMinutes: eta.etaMinMinutes,
      etaMaxMinutes: eta.etaMaxMinutes,
    });
  } catch (err) {
    console.error("zones/resolve failed", err);
    return NextResponse.json({ error: "zone resolution failed" }, { status: 500 });
  }
}
