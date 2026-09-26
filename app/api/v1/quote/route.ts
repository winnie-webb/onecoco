import { NextResponse } from "next/server";
import { resolveZone } from "@/lib/geo/zones";
import { checkServiceability } from "@/lib/pricing/serviceability";
import { buildQuote, QuoteError, type CartItem } from "@/lib/pricing/quote";
import { getSettings } from "@/lib/settings";
import { clientIp, isRateLimited } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

interface QuoteBody {
  cart?: CartItem[];
  lat?: unknown;
  lng?: unknown;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** §13 `POST /api/v1/quote` — cart → persisted quote. */
export async function POST(request: Request) {
  // §16: re-quoting on every cart edit is normal, legitimate traffic —
  // generous enough not to interfere with that, still a real ceiling.
  if (isRateLimited(`quote:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: QuoteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { cart, lat, lng } = body;
  if (!Array.isArray(cart) || cart.length === 0) {
    return NextResponse.json({ error: "cart must be a non-empty array" }, { status: 400 });
  }
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    return NextResponse.json({ error: "lat/lng are required to quote a delivery fee" }, { status: 400 });
  }

  try {
    const settings = await getSettings();
    const match = await resolveZone(lng, lat, settings.zoneBufferMetres);
    if (match.kind !== "covered") {
      return NextResponse.json({ error: "not in a covered zone" }, { status: 409 });
    }

    const serviceability = await checkServiceability(match.zone);
    if (!serviceability.serviceable) {
      return NextResponse.json({ error: "not serviceable right now", reason: serviceability.reason }, { status: 409 });
    }

    const quote = await buildQuote(cart, match.zone.id, match.zone.delivery_fee_cents, settings);
    return NextResponse.json(quote);
  } catch (err) {
    if (err instanceof QuoteError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("quote failed", err);
    return NextResponse.json({ error: "could not build quote" }, { status: 500 });
  }
}
