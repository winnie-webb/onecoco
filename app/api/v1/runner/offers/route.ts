import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** §13 `GET /api/v1/runner/offers` — open offers for this runner's beach. */
export async function GET() {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;

  const db = serviceClient();
  const { data, error } = await db
    .from("order_offers")
    .select("id, expires_at, orders(order_number, delivery_fee_cents, total_cents, currency, landmark_text, delivery_zones(name))")
    .eq("runner_id", guard.session.runnerId)
    .is("response", null)
    .gt("expires_at", new Date().toISOString())
    .order("offered_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const offers = (data ?? []).map((o) => {
    const order = o.orders as unknown as {
      order_number: number;
      delivery_fee_cents: number;
      total_cents: number;
      currency: string;
      landmark_text: string | null;
      delivery_zones: { name: string } | null;
    } | null;
    return {
      offerId: o.id,
      expiresAt: o.expires_at,
      orderNumber: order?.order_number,
      zoneName: order?.delivery_zones?.name ?? null,
      totalCents: order?.total_cents,
      currency: order?.currency,
      // Landmark shown pre-accept — a runner should be able to judge
      // distance/difficulty before committing, same reasoning as showing
      // the zone name.
      landmarkText: order?.landmark_text ?? null,
    };
  });

  return NextResponse.json({ offers });
}
