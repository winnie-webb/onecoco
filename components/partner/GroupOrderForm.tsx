"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { CatalogueProduct } from "@/lib/db/queries/catalogue";

export function GroupOrderForm({ products }: { products: CatalogueProduct[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(10);
  const [scheduledFor, setScheduledFor] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/partner/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          qty,
          scheduledFor: new Date(scheduledFor).toISOString(),
          contact: { name, phone, email },
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit the request.");
        return;
      }
      router.push("/partner/group-orders");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex max-w-lg flex-col gap-4 rounded-card border-2 border-sand-200 p-6">
      {error && <p className="font-medium text-red-700">{error}</p>}

      <label className="block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Product</span>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4">
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — US${(p.basePriceCents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Quantity</span>
        <input
          type="number"
          min={1}
          max={200}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Delivery date &amp; time</span>
        <input
          type="datetime-local"
          required
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">On-site contact name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Phone</span>
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Email</span>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Notes (e.g. where on the beach)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4" />
      </label>

      <p className="text-xs text-ink-soft">
        Billed as cash-on-delivery for now — a real invoicing option is still an open business question, not a limit of this form.
      </p>

      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? "Submitting…" : "Request group order"}
      </Button>
    </form>
  );
}
