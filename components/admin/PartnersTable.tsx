"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export interface PartnerRow {
  id: string;
  name: string;
  type: string;
  status: string;
  commissionRateBps: number;
  beachName: string | null;
}

export interface BeachOption {
  id: string;
  name: string;
}

const TYPES = ["HOTEL", "RESORT", "TOUR_OPERATOR", "RESTAURANT", "EVENT_PLANNER", "OTHER"];

export function PartnersTable({ partners: initialPartners, beaches }: { partners: PartnerRow[]; beaches: BeachOption[] }) {
  const [partners, setPartners] = useState(initialPartners);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [beachId, setBeachId] = useState(beaches[0]?.id ?? "");
  const [commissionPct, setCommissionPct] = useState("5");
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, beachId, commissionRateBps: Math.round(Number(commissionPct) * 100) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create partner.");
        return;
      }
      setPartners((prev) => [
        ...prev,
        {
          id: data.partnerId,
          name,
          type,
          status: "ACTIVE",
          commissionRateBps: Math.round(Number(commissionPct) * 100),
          beachName: beaches.find((b) => b.id === beachId)?.name ?? null,
        },
      ]);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  async function invite(partnerId: string) {
    const email = window.prompt("Partner contact email?");
    if (!email) return;
    const res = await fetch(`/api/v1/admin/partners/${partnerId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "Could not invite.");
      return;
    }
    setCredentials({ email: data.email, tempPassword: data.tempPassword });
  }

  async function createQr(partnerId: string) {
    const label = window.prompt("Placement label (e.g. 'Front desk')?");
    const res = await fetch(`/api/v1/admin/partners/${partnerId}/qr-codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placementLabel: label || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "Could not create QR code.");
      return;
    }
    window.alert(`QR code created: ${data.code}\nThe partner will see it (with a printable image) on their QR codes page.`);
  }

  return (
    <div className="mt-6">
      {!showForm && (
        <Button onClick={() => setShowForm(true)} variant="outline">
          Add partner
        </Button>
      )}

      {showForm && (
        <form onSubmit={createPartner} className="mb-6 flex flex-col gap-3 rounded-card border-2 border-sand-200 p-5 sm:max-w-sm">
          {error && <p className="font-medium text-red-700">{error}</p>}
          <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-full border-2 border-sand-200 px-4" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="min-h-11 rounded-full border-2 border-sand-200 px-4">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={beachId} onChange={(e) => setBeachId(e.target.value)} className="min-h-11 rounded-full border-2 border-sand-200 px-4">
            {beaches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <label className="text-sm text-ink-soft">
            Commission %
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-full border-2 border-sand-200 px-4"
            />
          </label>
          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>
      )}

      {credentials && (
        <div className="mb-6 rounded-card border-2 border-lime-500 bg-lime-500/10 p-4 text-sm">
          <p className="font-bold text-jungle-900">Partner user created — relay these credentials out of band:</p>
          <p className="mt-2 font-mono">{credentials.email}</p>
          <p className="font-mono">{credentials.tempPassword}</p>
        </div>
      )}

      {/* Below md: a card per partner — six columns plus two action buttons
          don't fit a phone width, and the row actions are the whole point
          of this page (invite a user, print a QR code), so they need real
          tap targets, not a cramped inline pair. */}
      <div className="space-y-3 md:hidden">
        {partners.length === 0 && (
          <p className="rounded-card border-2 border-sand-200 px-4 py-8 text-center text-ink-soft">No partners yet.</p>
        )}
        {partners.map((p) => (
          <div key={p.id} className="rounded-card border-2 border-sand-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-bold text-ink-soft">{p.status}</span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {p.type} · {p.beachName ?? "—"}
            </p>
            <p className="mt-1 text-sm">{(p.commissionRateBps / 100).toFixed(2)}% commission</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => invite(p.id)}
                className="min-h-11 rounded-full border border-jungle-800 text-sm font-semibold text-jungle-800"
              >
                Invite user
              </button>
              <button
                onClick={() => createQr(p.id)}
                className="min-h-11 rounded-full border border-jungle-800 text-sm font-semibold text-jungle-800"
              >
                New QR code
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-card border-2 border-sand-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Beach</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  No partners yet.
                </td>
              </tr>
            )}
            {partners.map((p) => (
              <tr key={p.id} className="border-t border-sand-200">
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3">{p.type}</td>
                <td className="px-4 py-3">{p.beachName ?? "—"}</td>
                <td className="px-4 py-3">{(p.commissionRateBps / 100).toFixed(2)}%</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => invite(p.id)} className="rounded-full border border-jungle-800 px-3 py-1 text-xs font-semibold text-jungle-800">
                      Invite user
                    </button>
                    <button onClick={() => createQr(p.id)} className="rounded-full border border-jungle-800 px-3 py-1 text-xs font-semibold text-jungle-800">
                      New QR code
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
