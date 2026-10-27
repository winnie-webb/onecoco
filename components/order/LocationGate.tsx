"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckoutFlow } from "@/components/order/CheckoutFlow";
import type { CardProvider } from "@/lib/payments/availability";
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
      hoursToday: string | null;
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

// "denied" is only the customer (or their browser settings) saying no.
// "timeout" and "unavailable" mean they said yes but the phone couldn't get
// a fix: different advice, and never "No problem" as if they refused.
type Phase = "idle" | "requesting" | "resolved" | "denied" | "timeout" | "unavailable" | "unsupported" | "error";

interface OpenBeach {
  zone: { id: string; name: string; beachName: string | null; deliveryFeeCents: number };
  serviceable: boolean;
  reason: string | null;
  hoursToday: string | null;
  etaMinMinutes: number;
  etaMaxMinutes: number;
  lat: number;
  lng: number;
}

const REASON_COPY: Record<string, string> = {
  ZONE_CLOSED: "we don't have vending permission at this beach yet",
  ZONE_PAUSED: "delivery here is paused right now",
  OUTSIDE_OPERATING_HOURS: "we're outside delivery hours for this spot",
  NO_RUNNER_ON_SHIFT: "no runner is on shift right now",
  OUT_OF_STOCK: "we're out of coconuts to prep right now",
};

// Fresh fix first; if that fails for any reason but a refusal, one retry
// that accepts a coarser or recent (up to 1 min old) position. Enough to
// pick the zone, and far likelier to succeed indoors or on a laptop.
const PRECISE: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 };
const COARSE: PositionOptions = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 };

const GPS_COPY: Record<"denied" | "timeout" | "unavailable" | "unsupported" | "error", { title: string; body: string }> = {
  denied: {
    title: "Location is switched off for this site.",
    body: "Your browser didn't share your location, so we can't check your spot. Allow location for this site in your browser settings and try again.",
  },
  timeout: {
    title: "We couldn't find you in time.",
    body: "Your phone took too long to get a location fix. Step out into open sky, check location is on, and try again.",
  },
  unavailable: {
    title: "Your phone couldn't work out where you are.",
    body: "Check that location services are on for your browser, then try again.",
  },
  unsupported: {
    title: "This browser can't share your location.",
    body: "Try another browser, or if you're on the beach, pick it below.",
  },
  error: {
    title: "Something went wrong checking your spot.",
    body: "That's on us, not your phone. Please try again.",
  },
};

export function LocationGate({
  products,
  qrCode,
  cardProvider,
}: {
  products: CatalogueProductWithCustomizations[];
  qrCode?: string;
  cardProvider: CardProvider | null;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracyM: number | null } | null>(null);
  // True when the customer picked their beach by hand because GPS failed:
  // we have no location for them, so checkout asks where they are instead.
  const [manual, setManual] = useState(false);
  const [demandEmail, setDemandEmail] = useState("");
  const [demandLabel, setDemandLabel] = useState("");
  const [demandSubmitted, setDemandSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const renderedAt = useRef<number | null>(null);

  useEffect(() => {
    renderedAt.current = Date.now();
    track("visit", { page: "order" });
  }, []);

  function pickBeachManually(beach: OpenBeach) {
    track("manual_beach_selected");
    setCoords({ lat: beach.lat, lng: beach.lng, accuracyM: null });
    setManual(true);
    setResult({
      match: "covered",
      serviceable: true,
      lowAccuracy: false,
      zone: beach.zone,
      etaMinMinutes: beach.etaMinMinutes,
      etaMaxMinutes: beach.etaMaxMinutes,
    });
    setPhase("resolved");
  }

  async function resolveSpot(position: GeolocationPosition) {
    track("location_granted");
    const { latitude, longitude, accuracy } = position.coords;
    setCoords({ lat: latitude, lng: longitude, accuracyM: accuracy });
    try {
      const res = await fetch("/api/v1/zones/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latitude, lng: longitude, accuracyM: accuracy }),
      });
      if (!res.ok) throw new Error(`resolve ${res.status}`);
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
  }

  function gpsFailed(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      track("location_denied");
      setPhase("denied");
    } else {
      track("location_failed", { code: error.code });
      setPhase(error.code === error.TIMEOUT ? "timeout" : "unavailable");
    }
  }

  function requestLocation() {
    setManual(false);
    if (!("geolocation" in navigator)) {
      setPhase("unsupported");
      return;
    }
    setPhase("requesting");
    navigator.geolocation.getCurrentPosition(
      resolveSpot,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) return gpsFailed(error);
        navigator.geolocation.getCurrentPosition(resolveSpot, gpsFailed, COARSE);
      },
      PRECISE,
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

      {(phase === "denied" ||
        phase === "timeout" ||
        phase === "unavailable" ||
        phase === "unsupported" ||
        phase === "error") && (
        <div className="text-center" role="status" aria-live="polite">
          <h2 className="font-display text-2xl font-bold text-jungle-900">{GPS_COPY[phase].title}</h2>
          <p className="mt-3 text-pretty leading-relaxed text-ink-soft">{GPS_COPY[phase].body}</p>
          {phase !== "unsupported" && (
            <Button onClick={requestLocation} className="mt-6" variant="outline">
              Try again
            </Button>
          )}
          <BeachStatus onPick={pickBeachManually} />
          <NotNearUs>
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
          </NotNearUs>
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
              <BeachStatus onPick={pickBeachManually} />
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
              <BeachStatus onPick={pickBeachManually} />
            </>
          )}

          {result.match === "covered" && !result.serviceable && (
            <>
              <h2 className="font-display text-2xl font-bold text-jungle-900">
                {result.zone.beachName ?? result.zone.name} isn&rsquo;t open right now.
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-ink-soft">
                We deliver here, but {REASON_COPY[result.reason] ?? "we can't serve this spot right now"}.
                {result.reason !== "ZONE_CLOSED" && result.reason !== "ZONE_PAUSED" && (
                  <> {hoursSentence(result.hoursToday)}</>
                )}{" "}
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
                <CheckoutFlow
                  products={products}
                  lat={coords.lat}
                  lng={coords.lng}
                  accuracyM={coords.accuracyM}
                  manualLocation={manual}
                  qrCode={qrCode}
                  cardProvider={cardProvider}
                />
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

function hoursSentence(hoursToday: string | null): string {
  return hoursToday ? `Delivery hours today: ${hoursToday}.` : "We don't deliver today.";
}

/** For when GPS can't place the customer: every beach we operate, with an
 * "I'm at ..." button for the ones taking orders now and a plain reason and
 * today's hours for the rest, so "closed" never looks like "broken". */
function BeachStatus({ onPick }: { onPick: (beach: OpenBeach) => void }) {
  const [beaches, setBeaches] = useState<OpenBeach[] | null>(null);

  useEffect(() => {
    fetch("/api/v1/zones/open", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { beaches: [] }))
      .then((data: { beaches: OpenBeach[] }) => setBeaches(data.beaches))
      .catch(() => setBeaches([]));
  }, []);

  if (!beaches || beaches.length === 0) return null;

  return (
    <div className="my-6 flex flex-col gap-3">
      {beaches.map((b) => {
        const name = b.zone.beachName ?? b.zone.name;
        return (
          <div key={b.zone.id} className="rounded-card border-2 border-jungle-800/30 p-4 text-center">
            {b.serviceable ? (
              <>
                <p className="font-semibold text-jungle-900">At {name} right now?</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Pick it and tell us where you are &mdash; we&rsquo;ll find you.
                </p>
                <Button onClick={() => onPick(b)} variant="outline" className="mt-3">
                  I&rsquo;m at {name}
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold text-jungle-900">{name} isn&rsquo;t taking orders right now.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {capitalise((b.reason && REASON_COPY[b.reason]) || "we can't serve it right now")}.
                  {b.reason !== "ZONE_PAUSED" && <> {hoursSentence(b.hoursToday)}</>}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function NotNearUs({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-sm text-ink-soft">
        Somewhere else? Leave your email and we&rsquo;ll tell you when we deliver there.
      </p>
      {children}
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
