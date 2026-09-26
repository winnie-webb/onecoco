import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * §13 `GET /api/v1/runner/offers` — open offers for this runner's beach.
 * Phase 7: an optional one-shot `lat`/`lng` (query params, like the
 * customer flow's location capture — not stored, not the persistent
 * `runner_locations` tracking Phase 7 also adds for active deliveries)
 * lets the response include how far each offer's prep point is, reusing
 * `nearest_prep_point_distance_m` from Phase 2.
 */
export async function GET(request: Request) {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const hasLocation = isFiniteNumber(lat) && isFiniteNumber(lng);

  const db = serviceClient();
  const { data, error } = await db
    .from("order_offers")
    .select(
      "id, expires_at, orders(order_number, delivery_fee_cents, total_cents, currency, landmark_text, beach_id, delivery_zones(name))",
    )
    .eq("runner_id", guard.session.runnerId)
    .is("response", null)
    .gt("expires_at", new Date().toISOString())
    .order("offered_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const offers = await Promise.all(
    (data ?? []).map(async (o) => {
      const order = o.orders as unknown as {
        order_number: number;
        delivery_fee_cents: number;
        total_cents: number;
        currency: string;
        landmark_text: string | null;
        beach_id: string;
        delivery_zones: { name: string } | null;
      } | null;

      let distanceM: number | null = null;
      if (hasLocation && order?.beach_id) {
        const { data: distance } = await db.rpc("nearest_prep_point_distance_m", {
          p_beach_id: order.beach_id,
          p_lng: lng,
          p_lat: lat,
        });
        distanceM = distance ?? null;
      }

      return {
        offerId: o.id,
        expiresAt: o.expires_at,
        orderNumber: order?.order_number,
        zoneName: order?.delivery_zones?.name ?? null,
        totalCents: order?.total_cents,
        currency: order?.currency,
        landmarkText: order?.landmark_text ?? null,
        distanceM,
      };
    }),
  );

  return NextResponse.json({ offers });
}
