"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FULFILLMENT_COPY } from "@/lib/orders/copy";
import type { FulfillmentStatus } from "@/lib/orders/state";

const LOCATION_PING_MS = 15_000;

export interface OrderDetail {
  orderId: string;
  orderNumber: number;
  fulfillmentStatus: FulfillmentStatus;
  landmarkText: string | null;
  customerDescription: string | null;
  contactPhone: string | null;
  totalCents: number;
  currency: string;
  cashDue: boolean;
  arrivingAnnounced: boolean;
}

export function ActiveDelivery({ order: initialOrder }: { order: OrderDetail }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [showCodeEntry, setShowCodeEntry] = useState(false);

  // §1.1/§17: GPS collected ONLY while OUT_FOR_DELIVERY, for THIS order —
  // never in the background, never before pickup or after delivery.
  useEffect(() => {
    if (order.fulfillmentStatus !== "OUT_FOR_DELIVERY" || !("geolocation" in navigator)) return;

    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetch("/api/v1/runner/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.orderId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracyM: position.coords.accuracy,
            }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    };

    ping();
    const interval = setInterval(ping, LOCATION_PING_MS);
    return () => clearInterval(interval);
  }, [order.fulfillmentStatus, order.orderId]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/runner/orders/${order.orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, occurredAt: new Date().toISOString(), ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That didn't work.");
        return;
      }
      if (action === "PICKED_UP") setOrder((o) => ({ ...o, fulfillmentStatus: "OUT_FOR_DELIVERY" }));
      if (action === "ARRIVING") setOrder((o) => ({ ...o, arrivingAnnounced: true }));
      if (action === "DELIVERED" || action === "UNDELIVERABLE") {
        router.push("/runner/today");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function markUndeliverable() {
    const reason = window.prompt("What happened? (shown to ops)");
    if (!reason) return;
    act("UNDELIVERABLE", { reason });
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-bold text-jungle-900">
        #{order.orderNumber} — {FULFILLMENT_COPY[order.fulfillmentStatus]}
      </h1>

      {order.cashDue && (
        <p className="mt-2 font-semibold text-jungle-800">
          Collect {order.currency === "USD" ? "US$" : order.currency + " "}
          {(order.totalCents / 100).toFixed(2)} cash on delivery
        </p>
      )}

      <div className="mt-4 rounded-card border-2 border-sand-200 p-4">
        {order.landmarkText && <p className="text-sm">Landmark: {order.landmarkText}</p>}
        {order.customerDescription && <p className="mt-1 text-sm">Look for: {order.customerDescription}</p>}
        {order.contactPhone && <p className="mt-1 text-sm">Phone: {order.contactPhone}</p>}
      </div>

      {error && <p className="mt-4 font-medium text-red-700">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {order.fulfillmentStatus === "ASSIGNED" && (
          <Button onClick={() => act("PICKED_UP")} disabled={busy} size="lg">
            Picked up
          </Button>
        )}

        {order.fulfillmentStatus === "OUT_FOR_DELIVERY" && !order.arrivingAnnounced && (
          <Button onClick={() => act("ARRIVING")} disabled={busy} size="lg">
            Arriving — notify customer
          </Button>
        )}

        {order.fulfillmentStatus === "OUT_FOR_DELIVERY" && !showCodeEntry && (
          <Button onClick={() => setShowCodeEntry(true)} disabled={busy} variant="outline" size="lg">
            Delivered
          </Button>
        )}

        {order.fulfillmentStatus === "OUT_FOR_DELIVERY" && showCodeEntry && (
          <div className="rounded-card border-2 border-sand-200 p-4">
            <label className="block">
              <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">
                Ask the customer for their 4-digit code
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={deliveryCode}
                onChange={(e) => setDeliveryCode(e.target.value)}
                className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-center text-2xl tracking-widest"
              />
            </label>
            <Button
              onClick={() => act("DELIVERED", { deliveryCode })}
              disabled={busy || deliveryCode.length !== 4}
              size="lg"
              className="mt-3 w-full"
            >
              Confirm delivered
            </Button>
          </div>
        )}

        {order.fulfillmentStatus === "OUT_FOR_DELIVERY" && (
          <button onClick={markUndeliverable} disabled={busy} className="text-sm font-medium text-red-700 underline">
            I can&rsquo;t find them
          </button>
        )}
      </div>
    </div>
  );
}
