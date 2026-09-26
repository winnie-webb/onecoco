import { NextResponse } from "next/server";
import { recordCustomerMoved } from "@/lib/orders/track";
import { clientIp, isRateLimited } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

interface MovedBody {
  lat?: unknown;
  lng?: unknown;
  accuracyM?: unknown;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * §13 `POST /api/v1/track/:token/moved` — §9's "I moved": people swim, move
 * to the bar, change chairs. Appends a fresh location fix rather than
 * failing the order (the first draft's only answer was UNDELIVERABLE).
 */
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  if (isRateLimited(`track-moved:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: MovedBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!isFiniteNumber(body.lat) || !isFiniteNumber(body.lng)) {
    return NextResponse.json({ error: "lat/lng must be finite numbers" }, { status: 400 });
  }

  const ok = await recordCustomerMoved(token, body.lat, body.lng, isFiniteNumber(body.accuracyM) ? body.accuracyM : undefined);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
