import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export interface LiveRunnerPin {
  runnerId: string;
  runnerName: string;
  orderNumber: number;
  lat: number;
  lng: number;
  accuracyM: number | null;
  capturedAt: string;
  staleSeconds: number;
}

export interface BeachCenter {
  lat: number;
  lng: number;
}

/**
 * §17: only runners on an ACTIVE delivery have any location at all — an
 * idle `AVAILABLE` runner genuinely has zero rows in `runner_locations`,
 * so there is nothing to show for them here, correctly, not as a gap.
 *
 * Reads `runner_locations_geo` (0016) rather than the raw `point` column —
 * PostgREST returns `geography` as an EWKB hex string over REST, not
 * GeoJSON; the view does the lng/lat extraction in SQL instead.
 */
export async function getLiveRunnerPins(db: SupabaseClient<Database>, beachId: string): Promise<LiveRunnerPin[]> {
  const { data: assignments, error } = await db
    .from("order_assignments")
    .select("runner_id, runners(name), orders!inner(order_number, beach_id)")
    .is("released_at", null)
    .eq("orders.beach_id", beachId);
  if (error) throw new Error(`active assignment read failed: ${error.message}`);

  const pins: LiveRunnerPin[] = [];
  for (const a of assignments ?? []) {
    const runner = a.runners as unknown as { name: string } | null;
    const order = a.orders as unknown as { order_number: number } | null;
    if (!runner || !order) continue;

    const { data: point } = await db
      .from("runner_locations_geo")
      .select("lng, lat, accuracy_m, captured_at")
      .eq("runner_id", a.runner_id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!point || point.lng == null || point.lat == null || !point.captured_at) continue;

    pins.push({
      runnerId: a.runner_id,
      runnerName: runner.name,
      orderNumber: order.order_number,
      lng: point.lng,
      lat: point.lat,
      accuracyM: point.accuracy_m,
      capturedAt: point.captured_at,
      staleSeconds: Math.round((Date.now() - new Date(point.captured_at).getTime()) / 1000),
    });
  }
  return pins;
}

export async function getBeachCenter(db: SupabaseClient<Database>, beachId: string): Promise<BeachCenter | null> {
  const { data, error } = await db.rpc("beach_lnglat", { p_beach_id: beachId }).maybeSingle();
  if (error || !data || data.lng == null || data.lat == null) return null;
  return { lng: data.lng, lat: data.lat };
}
