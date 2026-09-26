import { NextResponse } from "next/server";
import { getTrackPayload } from "@/lib/orders/track";
import { clientIp, isRateLimited } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * §13 `GET /api/v1/track/:token` — the guest tracking payload, polled every
 * ~5s (§10). `no-referrer` here specifically, or the token leaks in the
 * `Referer` header to whatever the customer navigates to next.
 */
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  if (isRateLimited(`track:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  if (!token || token.length < 16) {
    return notFound();
  }

  const payload = await getTrackPayload(token);
  if (!payload) return notFound();

  return NextResponse.json(payload, { headers: { "Referrer-Policy": "no-referrer" } });
}

function notFound() {
  // §10: identical shape for invalid, expired, or unknown tokens — a bot
  // probing tokens learns nothing about which case it hit.
  return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Referrer-Policy": "no-referrer" } });
}
