import { serviceClient } from "@/lib/db/client";
import type { Zone } from "@/lib/geo/zones";
import type { Settings } from "@/lib/settings";

export interface EtaRange {
  etaMinMinutes: number;
  etaMaxMinutes: number;
}

/**
 * §7: `prep_time + queue_wait(open_orders ÷ available_runners) + travel ×
 * zone.route_factor`, clamped to the zone's own configured bounds. A range,
 * never a countdown (§9) — routing on sand and crowds doesn't support a
 * precise minute.
 */
export async function computeEta(zone: Zone, lng: number, lat: number, settings: Settings): Promise<EtaRange> {
  const db = serviceClient();

  const [{ data: distanceM, error: distError }, { count: openOrders, error: orderError }, { count: availableRunners }] =
    await Promise.all([
      db.rpc("nearest_prep_point_distance_m", { p_beach_id: zone.beach_id, p_lng: lng, p_lat: lat }),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("zone_id", zone.id)
        .in("fulfillment_status", ["PLACED", "AWAITING_RUNNER", "ASSIGNED", "OUT_FOR_DELIVERY"]),
      db
        .from("runners")
        .select("id", { count: "exact", head: true })
        .eq("home_beach_id", zone.beach_id)
        .eq("active", true)
        .eq("shift_status", "AVAILABLE"),
    ]);
  if (distError) throw new Error(`distance lookup failed: ${distError.message}`);
  if (orderError) throw new Error(`open order count failed: ${orderError.message}`);

  const runners = Math.max(1, availableRunners ?? 1);
  const queueWaitMinutes = ((openOrders ?? 0) / runners) * settings.prepTimeMinutes;
  const travelMinutes = distanceM != null ? (distanceM * Number(zone.route_factor)) / (settings.walkingSpeedMps * 60) : 0;

  const raw = settings.prepTimeMinutes + queueWaitMinutes + travelMinutes;

  const clampedMin = Math.max(zone.eta_min_minutes, Math.round(raw * 0.8));
  const clampedMax = Math.min(Math.max(zone.eta_max_minutes, clampedMin), Math.round(raw * 1.2) + zone.eta_min_minutes);

  return {
    etaMinMinutes: Math.min(clampedMin, zone.eta_max_minutes),
    etaMaxMinutes: Math.max(clampedMax, clampedMin),
  };
}
