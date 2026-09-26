import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/client";
import { siteUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * §13 `POST /api/v1/demand` — out-of-zone "notify me" capture (§4.6:
 * `zone_demand_requests`, "the only evidence for where to expand next").
 *
 * §16 anti-abuse: honeypot + submit dwell-time floor + origin check, all
 * failing with the SAME vague error so a bot learns nothing about which
 * check tripped. No CAPTCHA — it costs real conversions.
 */

const MIN_DWELL_MS = 1500;

// A fresh Response every call — NextResponse bodies are one-shot streams, so
// a shared singleton here would only serve the FIRST rejected request and
// return an empty body to every one after it.
function vagueOk() {
  return NextResponse.json({ ok: true });
}

interface DemandBody {
  email?: unknown;
  lat?: unknown;
  lng?: unknown;
  accuracyM?: unknown;
  guessedLocationLabel?: unknown;
  // honeypot: a real user never fills this in; a bot filling every field will.
  website?: unknown;
  // client records Date.now() when the form first rendered.
  renderedAt?: unknown;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(siteUrl).origin) {
    return vagueOk();
  }

  let body: DemandBody;
  try {
    body = await request.json();
  } catch {
    return vagueOk();
  }

  if (typeof body.website === "string" && body.website.length > 0) {
    return vagueOk(); // honeypot tripped
  }

  if (isFiniteNumber(body.renderedAt) && Date.now() - body.renderedAt < MIN_DWELL_MS) {
    return vagueOk(); // submitted faster than a human reads the form
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  }

  const lat = isFiniteNumber(body.lat) ? body.lat : null;
  const lng = isFiniteNumber(body.lng) ? body.lng : null;
  const accuracyM = isFiniteNumber(body.accuracyM) ? body.accuracyM : null;
  const guessedLocationLabel =
    typeof body.guessedLocationLabel === "string" ? body.guessedLocationLabel.slice(0, 200) : null;

  try {
    const db = serviceClient();
    const { error } = await db.from("zone_demand_requests").insert({
      point: lat != null && lng != null ? `POINT(${lng} ${lat})` : null,
      accuracy_m: accuracyM,
      email,
      guessed_location_label: guessedLocationLabel,
      user_agent: request.headers.get("user-agent"),
    });
    if (error) throw error;
  } catch (err) {
    console.error("demand capture failed", err);
    return NextResponse.json({ error: "could not record request" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
