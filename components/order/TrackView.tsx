"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FULFILLMENT_COPY } from "@/lib/orders/copy";
import type { FulfillmentStatus } from "@/lib/orders/state";

interface TrackPayload {
  orderNumber: number;
  fulfillmentStatus: FulfillmentStatus;
  deliveryCode: string;
  promisedEtaMinMinutes: number | null;
  promisedEtaMaxMinutes: number | null;
  landmarkText: string | null;
  customerDescription: string | null;
  arrivingAnnounced: boolean;
  runnerName: string | null;
  deliveredAt: string | null;
  cancelledReason: string | null;
  canReportMoved: boolean;
  totalCents: number;
  currency: string;
  cashDue: boolean;
}

const TERMINAL: FulfillmentStatus[] = ["DELIVERED", "CANCELLED", "EXPIRED", "UNDELIVERABLE"];
const POLL_MS = 5000;

/** §10: the guest tracking page polls, it never subscribes to Realtime —
 * an anonymous client has no JWT a policy could check. */
export function TrackView({ token, justConfirmed = false }: { token: string; justConfirmed?: boolean }) {
  const [payload, setPayload] = useState<TrackPayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [movedSent, setMovedSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/v1/track/${token}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = (await res.json()) as TrackPayload;
        if (cancelled) return;
        setPayload(data);
        if (!TERMINAL.includes(data.fulfillmentStatus)) {
          timer.current = setTimeout(poll, POLL_MS);
        }
      } catch {
        if (!cancelled) timer.current = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [token]);

  function reportMoved() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      await fetch(`/api/v1/track/${token}/moved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        }),
      });
      setMovedSent(true);
      setTimeout(() => setMovedSent(false), 4000);
    });
  }

  if (notFound) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-jungle-900">We couldn&rsquo;t find that order.</h1>
        <p className="mt-3 text-ink-soft">This tracking link may have expired or been mistyped.</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <p className="text-center text-ink-soft" role="status">
        Loading your order…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg text-center" role="status" aria-live="polite">
      {justConfirmed && (
        <p className="mb-4 inline-block rounded-full bg-jungle-800 px-4 py-2 text-sm font-semibold text-lime-400">
          Order #{payload.orderNumber} confirmed
        </p>
      )}

      <h1 className="font-display text-3xl font-extrabold text-jungle-900">{FULFILLMENT_COPY[payload.fulfillmentStatus]}</h1>

      {payload.promisedEtaMinMinutes != null && payload.promisedEtaMaxMinutes != null && !TERMINAL.includes(payload.fulfillmentStatus) && (
        <p className="mt-2 text-ink-soft">
          Arriving in about {Math.max(0, payload.promisedEtaMinMinutes)}–{Math.max(0, payload.promisedEtaMaxMinutes)} minutes
        </p>
      )}

      {payload.arrivingAnnounced && (
        <p className="mt-4 rounded-card bg-lime-500/20 p-4 font-semibold text-jungle-900">
          {payload.runnerName ?? "Your runner"} is here — stand up and wave!
        </p>
      )}

      {payload.cashDue && !TERMINAL.includes(payload.fulfillmentStatus) && (
        <p className="mt-3 text-sm text-ink-soft">
          Total due on delivery: {payload.currency === "USD" ? "US$" : payload.currency + " "}
          {(payload.totalCents / 100).toFixed(2)} cash.
        </p>
      )}

      <div className="mt-6 rounded-card border-2 border-sand-200 p-5 text-left">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">Show this code to your runner</p>
        <p className="mt-1 font-display text-4xl font-extrabold tracking-widest text-jungle-900">{payload.deliveryCode}</p>
        {payload.landmarkText && <p className="mt-3 text-sm text-ink-soft">Landmark: {payload.landmarkText}</p>}
        {payload.customerDescription && <p className="text-sm text-ink-soft">Look for: {payload.customerDescription}</p>}
      </div>

      {payload.canReportMoved && (
        <div className="mt-6">
          <Button onClick={reportMoved} variant="outline">
            {movedSent ? "Got it — thanks!" : "I moved"}
          </Button>
        </div>
      )}

      {payload.fulfillmentStatus === "CANCELLED" && payload.cancelledReason && (
        <p className="mt-4 text-sm text-ink-soft">Reason: {payload.cancelledReason}</p>
      )}
    </div>
  );
}
