"use client";

import { useState } from "react";

export interface StockRow {
  id: string;
  beachName: string;
  prepPointName: string;
  qtyAvailable: number;
}

/** Coconuts on hand per beach. Orders count this down as they're placed;
 * cancelled and expired orders put theirs back. */
export function StockTable({ rows: initialRows }: { rows: StockRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function save(id: string) {
    const qty = Number(drafts[id]);
    if (!Number.isInteger(qty) || qty < 0) {
      window.alert("Enter a whole number of coconuts.");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/admin/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qtyAvailable: qty }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Could not update stock.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qtyAvailable: qty } : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {rows.length === 0 && <p className="text-ink-soft">No prep points set up.</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-card border-2 border-sand-200 p-4">
          <div className="min-w-40 flex-1">
            <p className="font-semibold">{r.beachName}</p>
            <p className="text-xs text-ink-soft">{r.prepPointName}</p>
          </div>
          <p className={`text-lg font-bold ${r.qtyAvailable === 0 ? "text-red-700" : "text-jungle-900"}`}>
            {r.qtyAvailable} left
          </p>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="New count"
            aria-label={`New coconut count for ${r.beachName}`}
            value={drafts[r.id] ?? ""}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
            className="min-h-11 w-28 rounded-full border-2 border-sand-200 px-4 text-base"
          />
          <button
            onClick={() => save(r.id)}
            disabled={busy === r.id || drafts[r.id] === undefined || drafts[r.id] === ""}
            className="min-h-11 rounded-full bg-jungle-800 px-4 text-sm font-semibold text-sand-50 disabled:opacity-40"
          >
            Set
          </button>
        </div>
      ))}
    </div>
  );
}
