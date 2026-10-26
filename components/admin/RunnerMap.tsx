"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/db/browser";
import type { BeachCenter, LiveRunnerPin } from "@/lib/db/queries/admin-map";

const EARTH_RADIUS_M = 6_371_000;
const POLL_MS = 8_000;

function metresFromCenter(center: BeachCenter, lat: number, lng: number): { x: number; y: number } {
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = ((lat - center.lat) * Math.PI) / 180;
  const dLng = ((lng - center.lng) * Math.PI) / 180;
  return {
    x: dLng * Math.cos(latRad) * EARTH_RADIUS_M,
    y: -dLat * EARTH_RADIUS_M, // screen y grows downward; north is up
  };
}

/**
 * A SCHEMATIC view, not a real map. This sandbox's network egress policy
 * rejects every map-tile host checked (Mapbox, OpenStreetMap, even the
 * unpkg CDN for a Leaflet fallback) — confirmed with a direct connectivity
 * test, not assumed — so no tile-based map could be rendered OR tested
 * here regardless of which provider the architecture names. This renders
 * real positions (equirectangular-projected metres from the beach centre,
 * fine at this scale) on a plain SVG grid instead: correct data, honest
 * about not being the real Mapbox GL JS integration §3 calls for. Swapping
 * in real tiles is a component-level change once a token and network path
 * exist — see PHASE-7-NOTES.md.
 */
export function RunnerMap({ beachCenter, initialPins }: { beachCenter: BeachCenter; initialPins: LiveRunnerPin[] }) {
  const [pins, setPins] = useState(initialPins);

  useEffect(() => {
    const supabase = browserClient();
    let cancelled = false;

    async function poll() {
      // runner_locations_geo (0016) — extracts lng/lat in SQL, since
      // PostgREST returns `geography` as an EWKB hex string, not GeoJSON.
      const { data } = await supabase
        .from("runner_locations_geo")
        .select(
          "runner_id, lng, lat, accuracy_m, captured_at, runners(name), assignment_id, order_assignments!inner(released_at, orders(order_number))",
        )
        .is("order_assignments.released_at", null)
        .order("captured_at", { ascending: false });
      if (cancelled || !data) return;

      const seen = new Set<string>();
      const fresh: LiveRunnerPin[] = [];
      for (const row of data) {
        if (!row.runner_id || seen.has(row.runner_id)) continue; // keep only the latest per runner
        seen.add(row.runner_id);
        const runner = row.runners as unknown as { name: string } | null;
        const assignment = row.order_assignments as unknown as { orders: { order_number: number } | null } | null;
        if (!runner || !assignment?.orders || row.lng == null || row.lat == null || !row.captured_at) continue;
        fresh.push({
          runnerId: row.runner_id,
          runnerName: runner.name,
          orderNumber: assignment.orders.order_number,
          lng: row.lng,
          lat: row.lat,
          accuracyM: row.accuracy_m,
          capturedAt: row.captured_at,
          staleSeconds: Math.round((Date.now() - new Date(row.captured_at).getTime()) / 1000),
        });
      }
      setPins(fresh);
    }

    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const RANGE_M = 400; // half-width of the view, in metres
  const SIZE = 320;
  const scale = SIZE / 2 / RANGE_M;

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-md rounded-card border-2 border-sand-200 bg-jungle-900/5">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={SIZE / 2} cy={SIZE / 2} r={(SIZE / 2) * f} fill="none" stroke="currentColor" className="text-sand-300" />
        ))}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={5} className="fill-jungle-800" />
        <text x={SIZE / 2 + 8} y={SIZE / 2 - 8} className="fill-jungle-800 text-[9px]">
          prep point
        </text>

        {pins.map((pin) => {
          const { x, y } = metresFromCenter(beachCenter, pin.lat, pin.lng);
          const cx = SIZE / 2 + x * scale;
          const cy = SIZE / 2 + y * scale;
          const stale = pin.staleSeconds > 90;
          return (
            <g key={pin.runnerId}>
              <circle cx={cx} cy={cy} r={7} className={stale ? "fill-sand-400" : "fill-lime-500"} stroke="#0b3d2e" strokeWidth={1.5} />
              <text x={cx + 10} y={cy + 4} className="fill-jungle-900 text-[10px] font-semibold">
                {pin.runnerName} · #{pin.orderNumber}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-2 text-xs text-ink-soft">
        Schematic, not a real map — Mapbox unverified live in this environment, see PHASE-7-NOTES.md. Grey pin = no update in 90s+.
      </p>

      {pins.length === 0 && <p className="mt-3 text-ink-soft">No runner currently out for delivery.</p>}
    </div>
  );
}
