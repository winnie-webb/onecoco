"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export interface RunnerRow {
  id: string;
  name: string;
  phone: string | null;
  shiftStatus: string;
  active: boolean;
  homeBeachName: string | null;
}

export interface BeachOption {
  id: string;
  name: string;
}

export function RunnersTable({ runners: initialRunners, beaches }: { runners: RunnerRow[]; beaches: BeachOption[] }) {
  const [runners, setRunners] = useState(initialRunners);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [homeBeachId, setHomeBeachId] = useState(beaches[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createRunner(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/runners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, homeBeachId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create runner.");
        return;
      }
      setCredentials({ email: data.email, tempPassword: data.tempPassword });
      setRunners((prev) => [
        ...prev,
        {
          id: data.runnerId,
          name,
          phone: phone || null,
          shiftStatus: "OFF_SHIFT",
          active: true,
          homeBeachName: beaches.find((b) => b.id === homeBeachId)?.name ?? null,
        },
      ]);
      setName("");
      setPhone("");
      setEmail("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mt-6">
      {!showForm && (
        <Button onClick={() => setShowForm(true)} variant="outline">
          Add runner
        </Button>
      )}

      {showForm && (
        <form onSubmit={createRunner} className="mb-6 flex flex-col gap-3 rounded-card border-2 border-sand-200 p-5 sm:max-w-sm">
          {error && <p className="font-medium text-red-700">{error}</p>}
          <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-full border-2 border-sand-200 px-4" />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 rounded-full border-2 border-sand-200 px-4" />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 rounded-full border-2 border-sand-200 px-4" />
          <select value={homeBeachId} onChange={(e) => setHomeBeachId(e.target.value)} className="min-h-11 rounded-full border-2 border-sand-200 px-4">
            {beaches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>
      )}

      {credentials && (
        <div className="mb-6 rounded-card border-2 border-lime-500 bg-lime-500/10 p-4 text-sm">
          <p className="font-bold text-jungle-900">Runner created — relay these credentials out of band, they won&rsquo;t be shown again:</p>
          <p className="mt-2 font-mono">{credentials.email}</p>
          <p className="font-mono">{credentials.tempPassword}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-card border-2 border-sand-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Beach</th>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {runners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No runners yet.
                </td>
              </tr>
            )}
            {runners.map((r) => (
              <tr key={r.id} className="border-t border-sand-200">
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td className="px-4 py-3">{r.phone ?? "—"}</td>
                <td className="px-4 py-3">{r.homeBeachName ?? "—"}</td>
                <td className="px-4 py-3">{r.shiftStatus}</td>
                <td className="px-4 py-3">{r.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
