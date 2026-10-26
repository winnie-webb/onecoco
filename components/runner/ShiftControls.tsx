"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const HEARTBEAT_MS = 60_000;

export function ShiftControls({ initialShiftStatus }: { initialShiftStatus: string }) {
  const [status, setStatus] = useState(initialShiftStatus);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "OFF_SHIFT") {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    // §4.5: device_last_seen_at — liveness, not a status. Only pinged while
    // on shift, not on every page view.
    fetch("/api/v1/runner/heartbeat", { method: "POST" }).catch(() => {});
    timer.current = setInterval(() => {
      fetch("/api/v1/runner/heartbeat", { method: "POST" }).catch(() => {});
    }, HEARTBEAT_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [status]);

  async function startShift() {
    setBusy(true);
    const res = await fetch("/api/v1/runner/shift/start", { method: "POST" });
    if (res.ok) setStatus("AVAILABLE");
    else window.alert((await res.json()).error ?? "Could not start shift.");
    setBusy(false);
  }

  async function endShift() {
    setBusy(true);
    const res = await fetch("/api/v1/runner/shift/end", { method: "POST" });
    if (res.ok) setStatus("OFF_SHIFT");
    else window.alert((await res.json()).error ?? "Could not end shift.");
    setBusy(false);
  }

  return (
    <div className="rounded-card border-2 border-sand-200 p-5">
      <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">Shift</p>
      <p className="mt-1 text-2xl font-bold text-jungle-900">{status === "OFF_SHIFT" ? "Off shift" : "On shift"}</p>
      <div className="mt-4">
        {status === "OFF_SHIFT" ? (
          <Button onClick={startShift} disabled={busy} size="lg" className="w-full">
            Start shift
          </Button>
        ) : (
          <Button onClick={endShift} disabled={busy} variant="outline" size="lg" className="w-full">
            End shift
          </Button>
        )}
      </div>
    </div>
  );
}
