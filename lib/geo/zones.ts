import { serviceClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/types";

export type Zone = Tables<"delivery_zones">;

export type ZoneMatch =
  | { kind: "covered"; zone: Zone }
  | { kind: "borderline"; zone: Zone }
  | { kind: "none" };

/**
 * §9: ST_Covers first. If nothing covers the point, fall back to the
 * borderline band (ST_DWithin `bufferMetres`) rather than a flat rejection —
 * a 20m GPS error should not lose a sale. Overlaps resolve by priority, then
 * smallest area (both handled by the SQL functions' ORDER BY).
 */
export async function resolveZone(lng: number, lat: number, bufferMetres: number): Promise<ZoneMatch> {
  const db = serviceClient();

  const covering = await db.rpc("zones_covering_point", { p_lng: lng, p_lat: lat });
  if (covering.error) throw new Error(`zone resolution failed: ${covering.error.message}`);
  if (covering.data && covering.data.length > 0) {
    return { kind: "covered", zone: covering.data[0] };
  }

  const near = await db.rpc("zones_near_point", { p_lng: lng, p_lat: lat, p_meters: bufferMetres });
  if (near.error) throw new Error(`zone borderline check failed: ${near.error.message}`);
  if (near.data && near.data.length > 0) {
    return { kind: "borderline", zone: near.data[0] };
  }

  return { kind: "none" };
}
