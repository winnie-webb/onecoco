import { serviceClient } from "@/lib/db/client";

/**
 * Every number that would otherwise be a literal in application code
 * (§4.6, §27.4). Seeded in `supabase/seed/jamaica.sql`; read fresh per
 * request rather than baked into a build, since ops can change these without
 * a deploy once Phase 4 ships an admin settings screen.
 */
export interface Settings {
  taxRateBps: number;
  serviceFeeCents: number;
  walkingSpeedMps: number;
  prepTimeMinutes: number;
  quoteTtlMinutes: number;
  acceptWindowMinutes: number;
  zoneBufferMetres: number;
  accuracyThresholdM: number;
  trackTokenTtlHours: number;
}

const KEYS = {
  tax_rate_bps: "taxRateBps",
  service_fee_cents: "serviceFeeCents",
  walking_speed_mps: "walkingSpeedMps",
  prep_time_minutes: "prepTimeMinutes",
  quote_ttl_minutes: "quoteTtlMinutes",
  accept_window_minutes: "acceptWindowMinutes",
  zone_buffer_metres: "zoneBufferMetres",
  accuracy_threshold_m: "accuracyThresholdM",
  track_token_ttl_hours: "trackTokenTtlHours",
} as const satisfies Record<string, keyof Settings>;

// Deliberately conservative defaults if a key is somehow missing from the
// `settings` table — never invent a real tax rate or fee (§27.4).
const DEFAULTS: Settings = {
  taxRateBps: 0,
  serviceFeeCents: 0,
  walkingSpeedMps: 1.1,
  prepTimeMinutes: 3,
  quoteTtlMinutes: 15,
  acceptWindowMinutes: 6,
  zoneBufferMetres: 75,
  accuracyThresholdM: 100,
  trackTokenTtlHours: 24,
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await serviceClient().from("settings").select("key, value");
  if (error) throw new Error(`settings read failed: ${error.message}`);

  const result = { ...DEFAULTS };
  for (const row of data ?? []) {
    const field = KEYS[row.key as keyof typeof KEYS];
    if (!field) continue;
    const value = row.value as unknown;
    if (typeof value === "number") result[field] = value;
  }
  return result;
}
