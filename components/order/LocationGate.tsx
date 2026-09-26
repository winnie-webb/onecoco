"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckoutFlow } from "@/components/order/CheckoutFlow";
import { track } from "@/lib/analytics/events";
import type { CatalogueProductWithCustomizations } from "@/lib/db/queries/catalogue";

type ResolveResponse =
  | { match: "none"; serviceable: false; reason: "OUT_OF_ZONE" }
  | {
      match: "borderline";
      serviceable: false;
      reason: "BORDERLINE_UNCONFIRMED";
      lowAccuracy: boolean;
      zone: { name: string; beachName: string | null };
    }
  | {
      match: "covered";
      serviceable: false;
      lowAccuracy: boolean;
      reason: "ZONE_CLOSED" | "ZONE_PAUSED" | "OUTSIDE_OPERATING_HOURS" | "NO_RUNNER_ON_SHIFT" | "OUT_OF_STOCK";
      zone: { id: string; name: string; beachName: string | null; deliveryFeeCents: number };
    }
  | {
      match: "covered";
      serviceable: true;
      lowAccuracy: boolean;
      zone: { id: string; name: string; beachName: string | null; deliveryFeeCents: number };
      etaMinMinutes: number;
      etaMaxMinutes: number;
    };

type Phase = "idle" | "requesting" | "resolved" | "denied" | "unsupported" | "error";

const REASON_COPY: Record<string, string> = {
  ZONE_CLOSED: "we don't have vending permission at this beach yet",
  ZONE_PAUSED: "delivery here is paused right now",
  OUTSIDE_OPERATING_HOURS: "we're outside delivery hours for this spot",
  NO_RUNNER_ON_SHIFT: "no runner is on shift right now",
  OUT_OF_STOCK: "we're out of coconuts to prep right now",
};

export function LocationGate({ products, qrCode }: { products: CatalogueProductWithCustomizations[]; qrCode?: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracyM: number | null } | null>(null);
  const [demandEmail, setDemandEmail] = useState("");
  const [demandLabel, setDemandLabel] = useState("");
  const [demandSubmitted, setDemandSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const renderedAt = useRef<number | null>(null);

  useEffect(() => {
    renderedAt.current = Date.now();
    track("visit", { page: "order" });
  }, []);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setPhase("unsupported");
      return;
    }
    setPhase("requesting");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        track("location_granted");
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ lat: latitude, lng: longitude, accuracyM: accuracy });
        try {
          const res = await fetch("/api/v1/zones/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude, accuracyM: accuracy }),
          });
          const data = (await res.json()) as ResolveResponse;
          track(data.match === "none" ? "out_of_zone" : "in_zone");
          track(data.serviceable ? "serviceable" : "not_serviceable", {
            reason: "reason" in data ? data.reason : undefined,
          });
          setResult(data);
          setPhase("resolved");
        } catch {
          setPhase("error");
        }
      },
      () => {
        track("location_denied");
        setPhase("denied");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function submitDemand(e: React.FormEvent) {
    e.preventDefault();
    if (!demandEmail) return;
    await fetch("/api/v1/demand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: demandEmail,
        guessedLocationLabel: demandLabel || undefined,
        website: honeypot,
        renderedAt: renderedAt.current,
      }),
    });
    setDemandSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-xl">
      {phase === "idle" && (
        <div className="text-center">
          <p className="mb-6 text-pretty leading-relaxed text-ink-soft">
            We need your location to check whether we deliver to your spot and
            how far away it is. We only use it once, right now — never
            tracked in the background.
          </p>
          <Button onClick={requestLocation} size="lg">
            Use my location
          </Button>
        </div>
      )}

      {phase === "requesting" && (
        <p className="text-center text-ink-soft" role="status">
          Checking your spot…
        </p>
      )}

      {(phase === "denied" || phase === "unsupported" || phase === "error") && (
        <div className="text-center">
          <p className="mb-6 text-pretty leading-relaxed text-ink-soft">
            {phase === "denied" &&
              "No problem — we can't confirm delivery to your exact spot without it, but leave your email and roughly where you are, and we'll follow up when we're serviceable there."}
            {phase === "unsupported" &&
              "Your browser doesn't support location. Leave your email and roughly where you are instead."}
            {phase === "error" && "Something went wrong checking your spot. Try again, or leave your email below."}
          </p>
          <DemandForm
            email={demandEmail}
            setEmail={setDemandEmail}
            label={demandLabel}
            setLabel={setDemandLabel}
            honeypot={honeypot}
            setHoneypot={setHoneypot}
            submitted={demandSubmitted}
            onSubmit={submitDemand}
          />
        </div>
      )}

      {phase === "resolved" && result && (
        <div className="text-center" role="status" aria-live="polite">
          {result.match === "none" && (
            <>
              <h2 className="font-display text-2xl font-bold text-jungle-900">
                We&rsquo;re not there yet.
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-ink-soft">
                Your spot isn&rsquo;t in a beach we currently cover. Leave
                your email and we&rsquo;ll let you know the moment we launch
                near you.
              </p>
              <div className="mt-6">
                <DemandForm
                  email={demandEmail}
                  setEmail={setDemandEmail}
                  label={demandLabel}
                  setLabel={setDemandLabel}
                  honeypot={honeypot}
                  setHoneypot={setHoneypot}
                  submitted={demandSubmitted}
                  onSubmit={submitDemand}
                />
              </div>
            </>
          )}

          {result.match === "borderline" && (
            <>
              <h2 className="font-display text-2xl font-bold text-jungle-900">
                You look close to {result.zone.beachName ?? result.zone.name}.
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-ink-soft">
                Your signal put you just outside our covered area there. If
                you&rsquo;re actually on the beach, try again with a stronger
                GPS fix — walking toward open sky usually helps.
              </p>
              <Button onClick={requestLocation} className="mt-6" variant="outline">
                Try again
              </Button>
            </>
          )}

          {result.match === "covered" && !result.serviceable && (
            <>
              <h2 className="font-display text-2xl font-bold text-jungle-900">
                {result.zone.beachName ?? result.zone.name} isn&rsquo;t open right now.
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-ink-soft">
                We deliver here, but {REASON_COPY[result.reason] ?? "we can't serve this spot right now"}.
                Leave your email and we&rsquo;ll let you know the moment that changes.
              </p>
              <div className="mt-6">
                <DemandForm
                  email={demandEmail}
                  setEmail={setDemandEmail}
                  label={demandLabel}
                  setLabel={setDemandLabel}
                  honeypot={honeypot}
                  setHoneypot={setHoneypot}
                  submitted={demandSubmitted}
                  onSubmit={submitDemand}
                />
              </div>
            </>
          )}

          {result.match === "covered" && result.serviceable && coords && (
            <div className="text-left">
              <h2 className="text-center font-display text-2xl font-bold text-jungle-900">
                Good news — {result.zone.beachName ?? result.zone.name} is covered.
              </h2>
              <p className="mt-3 text-center text-pretty leading-relaxed text-ink-soft">
                Delivery fee US${(result.zone.deliveryFeeCents / 100).toFixed(2)}, arriving in{" "}
                {result.etaMinMinutes}–{result.etaMaxMinutes} minutes.
              </p>
              <div className="mt-6">
                <CheckoutFlow products={products} lat={coords.lat} lng={coords.lng} accuracyM={coords.accuracyM} qrCode={qrCode} />
              </div>
            </div>
          )}

          {"lowAccuracy" in result && result.lowAccuracy && (
            <p className="mt-4 text-sm text-ink-soft">
              Your location signal was weak, so treat this as approximate.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DemandForm({
  email,
  setEmail,
  label,
  setLabel,
  honeypot,
  setHoneypot,
  submitted,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  label: string;
  setLabel: (v: string) => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
  submitted: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (submitted) {
    return <p className="font-semibold text-jungle-800">Thanks — we&rsquo;ll be in touch.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      {/* Honeypot: hidden from real users via CSS, invisible to screen readers via tabIndex/aria-hidden. */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
      />
      <label className="sr-only" htmlFor="demand-email">
        Email
      </label>
      <input
        id="demand-email"
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-h-11 rounded-full border-2 border-jungle-800/30 px-4 text-base text-jungle-900 outline-none focus:border-jungle-800"
      />
      <label className="sr-only" htmlFor="demand-label">
        Roughly where you are
      </label>
      <input
        id="demand-label"
        type="text"
        placeholder="Which beach? (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="min-h-11 rounded-full border-2 border-jungle-800/30 px-4 text-base text-jungle-900 outline-none focus:border-jungle-800"
      />
      <Button type="submit">Notify me</Button>
    </form>
  );
}
