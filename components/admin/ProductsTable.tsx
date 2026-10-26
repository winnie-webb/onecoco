"use client";

import { useState } from "react";

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  basePriceCents: number;
  currency: string;
  active: boolean;
}

export function ProductsTable({ products: initialProducts }: { products: ProductRow[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function save(id: string) {
    const draft = drafts[id];
    if (draft === undefined) return;
    const cents = Math.round(Number(draft) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      window.alert("Enter a valid price.");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePriceCents: cents }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Could not update price.");
        return;
      }
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, basePriceCents: cents } : p)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Could not update.");
        return;
      }
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      {/* Below md: a card per product — the fourth column (the Active
          toggle, an actually-used control, not decoration) was clipped
          off-screen entirely at phone width in the table layout. */}
      <div className="space-y-3 md:hidden">
        {products.map((p) => (
          <div key={p.id} className="rounded-card border-2 border-sand-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <span className="font-mono text-xs text-ink-soft">{p.sku}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                defaultValue={(p.basePriceCents / 100).toFixed(2)}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="min-h-11 w-24 rounded-full border-2 border-sand-200 px-3"
              />
              <button
                onClick={() => save(p.id)}
                disabled={busy === p.id || drafts[p.id] === undefined}
                className="min-h-11 flex-1 rounded-full border-2 border-jungle-800 text-sm font-semibold text-jungle-800 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            <button
              onClick={() => toggleActive(p.id, !p.active)}
              disabled={busy === p.id}
              className={`mt-2 min-h-11 w-full rounded-full text-sm font-bold uppercase ${
                p.active ? "bg-lime-500/20 text-jungle-800" : "bg-sand-200 text-ink-soft"
              }`}
            >
              {p.active ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-card border-2 border-sand-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-sand-200">
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(p.basePriceCents / 100).toFixed(2)}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-24 rounded-full border-2 border-sand-200 px-3 py-1"
                    />
                    <button
                      onClick={() => save(p.id)}
                      disabled={busy === p.id || drafts[p.id] === undefined}
                      className="rounded-full border-2 border-jungle-800 px-3 py-1 text-xs font-semibold text-jungle-800 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(p.id, !p.active)}
                    disabled={busy === p.id}
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      p.active ? "bg-lime-500/20 text-jungle-800" : "bg-sand-200 text-ink-soft"
                    }`}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
