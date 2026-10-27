import { serviceClient } from "@/lib/db/client";
import type { Zone } from "@/lib/geo/zones";

/**
 * §7's serviceability gate. Zone containment alone is not enough — all of
 * these must hold, or the honest answer is "not right now", never a range:
 *
 *   zone is within operating_hours
 *   AND zone.service_status = 'OPEN'
 *   AND >=1 runner on shift in that zone
 *   AND inventory.qty_available > 0
 */
export type ServiceabilityReason =
  | "ZONE_CLOSED"
  | "ZONE_PAUSED"
  | "OUTSIDE_OPERATING_HOURS"
  | "NO_RUNNER_ON_SHIFT"
  | "OUT_OF_STOCK";

/** `hoursToday` is the zone's delivery hours for today in the beach's own
 * timezone ("9am–5pm"), `null` when it doesn't deliver today, and absent when
 * the zone has no schedule or is closed/paused — so the order page can say
 * when to come back instead of only "not right now". */
export type ServiceabilityResult =
  | { serviceable: true; hoursToday?: string | null }
  | { serviceable: false; reason: ServiceabilityReason; hoursToday?: string | null };

interface OperatingHoursWindow {
  [day: string]: [string, string][] | undefined;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Today's delivery windows in `timezone`, or `undefined` if no schedule is
 * configured at all (= no restriction). */
function todaysWindows(hours: unknown, now: Date, timezone: string): { windows: [string, string][]; nowMinutes: number } | undefined {
  const parsed = hours as OperatingHoursWindow;
  if (!parsed || typeof parsed !== "object") return undefined;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value?.slice(0, 3).toLowerCase();
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const nowMinutes = (Number(hour) % 24) * 60 + Number(minute);

  const dayKey = DAY_KEYS.find((d) => d === weekdayShort);
  return { windows: (dayKey ? parsed[dayKey] : undefined) ?? [], nowMinutes };
}

function withinOperatingHours(hours: unknown, now: Date, timezone: string): boolean {
  const today = todaysWindows(hours, now, timezone);
  if (!today) return true; // no schedule configured = no restriction
  return today.windows.some(([start, end]) => today.nowMinutes >= toMinutes(start) && today.nowMinutes <= toMinutes(end));
}

function formatClock(hhmm: string): string {
  const minutes = toMinutes(hhmm);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h % 24 < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatHoursToday(hours: unknown, now: Date, timezone: string): string | null | undefined {
  const today = todaysWindows(hours, now, timezone);
  if (!today) return undefined;
  if (today.windows.length === 0) return null;
  return today.windows.map(([start, end]) => `${formatClock(start)}–${formatClock(end)}`).join(", ");
}

export async function checkServiceability(zone: Zone, now: Date = new Date()): Promise<ServiceabilityResult> {
  if (zone.service_status === "CLOSED") return { serviceable: false, reason: "ZONE_CLOSED" };
  if (zone.service_status === "PAUSED") return { serviceable: false, reason: "ZONE_PAUSED" };

  const db = serviceClient();

  const { data: beach, error: beachError } = await db
    .from("beaches")
    .select("id, city_id, cities(timezone)")
    .eq("id", zone.beach_id)
    .single();
  if (beachError) throw new Error(`beach lookup failed: ${beachError.message}`);

  const timezone = (beach as unknown as { cities: { timezone: string } | null })?.cities?.timezone ?? "UTC";
  const hoursToday = formatHoursToday(zone.operating_hours, now, timezone);
  if (!withinOperatingHours(zone.operating_hours, now, timezone)) {
    return { serviceable: false, reason: "OUTSIDE_OPERATING_HOURS", hoursToday };
  }

  const { count: availableRunners, error: runnerError } = await db
    .from("runners")
    .select("id", { count: "exact", head: true })
    .eq("home_beach_id", zone.beach_id)
    .eq("active", true)
    .eq("shift_status", "AVAILABLE");
  if (runnerError) throw new Error(`runner check failed: ${runnerError.message}`);
  if (!availableRunners || availableRunners < 1) {
    return { serviceable: false, reason: "NO_RUNNER_ON_SHIFT", hoursToday };
  }

  const { data: prepPoints, error: prepError } = await db
    .from("prep_points")
    .select("id")
    .eq("beach_id", zone.beach_id)
    .eq("active", true);
  if (prepError) throw new Error(`prep point lookup failed: ${prepError.message}`);
  const prepPointIds = (prepPoints ?? []).map((p) => p.id);

  if (prepPointIds.length === 0) return { serviceable: false, reason: "OUT_OF_STOCK", hoursToday };

  const { data: stock, error: stockError } = await db
    .from("inventory")
    .select("qty_available")
    .in("prep_point_id", prepPointIds)
    .gt("qty_available", 0)
    .limit(1);
  if (stockError) throw new Error(`inventory check failed: ${stockError.message}`);
  if (!stock || stock.length === 0) return { serviceable: false, reason: "OUT_OF_STOCK", hoursToday };

  return { serviceable: true, hoursToday };
}
