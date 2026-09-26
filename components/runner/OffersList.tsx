"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { browserClient } from "@/lib/db/browser";

interface Offer {
  offerId: string;
  expiresAt: string;
  orderNumber: number;
  zoneName: string | null;
  totalCents: number;
  currency: string;
  landmarkText: string | null;
}

async function fetchOffers(): Promise<Offer[]> {
  const res = await fetch("/api/v1/runner/offers", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.offers;
}

/** §3, §6: runner offers over Realtime (`order_offers`, RLS-scoped to this
 * runner) — refetches the list on any change rather than trying to patch
 * individual rows, since an offer disappearing (accepted/expired) is just
 * as important as one appearing. */
export function OffersList({ initialOffers, runnerId }: { initialOffers: Offer[]; runnerId: string }) {
  const [offers, setOffers] = useState(initialOffers);
  const [accepting, setAccepting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = browserClient();
    const channel = supabase
      .channel("runner-offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_offers", filter: `runner_id=eq.${runnerId}` }, () => {
        fetchOffers().then(setOffers);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [runnerId]);

  async function accept(offerId: string) {
    setAccepting(offerId);
    try {
      const res = await fetch(`/api/v1/runner/offers/${offerId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.message ?? "Could not accept.");
        setOffers(await fetchOffers());
        return;
      }
      router.push("/runner/today");
    } finally {
      setAccepting(null);
    }
  }

  if (offers.length === 0) {
    return <p className="text-ink-soft">No offers right now. New ones show up here automatically.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {offers.map((o) => (
        <div key={o.offerId} className="rounded-card border-2 border-sand-200 p-4">
          <p className="font-semibold text-jungle-900">
            #{o.orderNumber} — {o.zoneName ?? "Unknown zone"}
          </p>
          {o.landmarkText && <p className="text-sm text-ink-soft">{o.landmarkText}</p>}
          <p className="mt-1 text-sm text-ink-soft">
            {o.currency === "USD" ? "US$" : o.currency + " "}
            {(o.totalCents / 100).toFixed(2)} order
          </p>
          <Button onClick={() => accept(o.offerId)} disabled={accepting === o.offerId} className="mt-3 w-full">
            {accepting === o.offerId ? "Accepting…" : "Accept"}
          </Button>
        </div>
      ))}
    </div>
  );
}
