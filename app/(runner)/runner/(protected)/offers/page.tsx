import type { Metadata } from "next";
import { requireRunnerSession } from "@/lib/auth/runner-guards";
import { serverClient } from "@/lib/db/server";
import { OffersList } from "@/components/runner/OffersList";

export const metadata: Metadata = { title: "Offers" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requireRunnerSession();
  const db = await serverClient();

  const { data } = await db
    .from("order_offers")
    .select("id, expires_at, orders(order_number, delivery_fee_cents, total_cents, currency, landmark_text, delivery_zones(name))")
    .eq("runner_id", session.runnerId)
    .is("response", null)
    .gt("expires_at", new Date().toISOString())
    .order("offered_at", { ascending: true });

  const offers = (data ?? []).map((o) => {
    const order = o.orders as unknown as {
      order_number: number;
      total_cents: number;
      currency: string;
      landmark_text: string | null;
      delivery_zones: { name: string } | null;
    } | null;
    return {
      offerId: o.id,
      expiresAt: o.expires_at,
      orderNumber: order?.order_number ?? 0,
      zoneName: order?.delivery_zones?.name ?? null,
      totalCents: order?.total_cents ?? 0,
      currency: order?.currency ?? "USD",
      landmarkText: order?.landmark_text ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 font-display text-2xl font-bold text-jungle-900">Offers</h1>
      <OffersList initialOffers={offers} runnerId={session.runnerId} />
    </div>
  );
}
