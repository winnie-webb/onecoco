"use client";

import { useState } from "react";

export interface ZoneRow {
  id: string;
  name: string;
  beachName: string | null;
  serviceStatus: "OPEN" | "PAUSED" | "CLOSED";
  pauseReason: string | null;
  deliveryFeeCents: number;
}

const STATUS_STYLES: Record<ZoneRow["serviceStatus"], string> = {
  OPEN: "bg-lime-500/20 text-jungle-800",
  PAUSED: "bg-yellow-200 text-yellow-900",
  CLOSED: "bg-sand-200 text-ink-soft",
};

export function ZonesTable({ zones: initialZones }: { zones: ZoneRow[] }) {
  const [zones, setZones] = useState(initialZones);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, serviceStatus: ZoneRow["serviceStatus"]) {
    let pauseReason: string | null = null;
    if (serviceStatus === "PAUSED") {
      pauseReason = window.prompt("Why is this zone pausing? (shown internally)") ?? "";
      if (!pauseReason) return;
    }

    setBusy(id);
    try {
      const res = await fetch(`/api/v1/admin/zones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceStatus, pauseReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Could not update zone.");
        return;
      }
      setZones((prev) => prev.map((z) => (z.id === id ? { ...z, serviceStatus, pauseReason } : z)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {zones.map((zone) => (
        <div key={zone.id} className="rounded-card border-2 border-sand-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-jungle-900">{zone.name}</p>
              <p className="text-sm text-ink-soft">{zone.beachName}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[zone.serviceStatus]}`}>
              {zone.serviceStatus}
            </span>
          </div>
          {zone.pauseReason && zone.serviceStatus === "PAUSED" && (
            <p className="mt-2 text-sm text-ink-soft">Reason: {zone.pauseReason}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setStatus(zone.id, "OPEN")}
              disabled={busy === zone.id || zone.serviceStatus === "OPEN"}
              className="rounded-full border-2 border-jungle-800 px-4 py-2 text-sm font-semibold text-jungle-800 disabled:opacity-40"
            >
              Open
            </button>
            <button
              onClick={() => setStatus(zone.id, "PAUSED")}
              disabled={busy === zone.id || zone.serviceStatus === "PAUSED"}
              className="rounded-full border-2 border-yellow-600 px-4 py-2 text-sm font-semibold text-yellow-800 disabled:opacity-40"
            >
              Pause
            </button>
            <button
              onClick={() => setStatus(zone.id, "CLOSED")}
              disabled={busy === zone.id || zone.serviceStatus === "CLOSED"}
              className="rounded-full border-2 border-sand-400 px-4 py-2 text-sm font-semibold text-ink-soft disabled:opacity-40"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
