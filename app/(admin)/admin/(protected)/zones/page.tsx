import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { ZonesTable, type ZoneRow } from "@/components/admin/ZonesTable";

export const metadata: Metadata = { title: "Zones · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await serverClient();
  const { data, error } = await db
    .from("delivery_zones")
    .select("id, name, service_status, pause_reason, delivery_fee_cents, beaches(name)")
    .order("name");
  if (error) throw new Error(error.message);

  const zones: ZoneRow[] = (data ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    beachName: (z.beaches as unknown as { name: string } | null)?.name ?? null,
    serviceStatus: z.service_status,
    pauseReason: z.pause_reason,
    deliveryFeeCents: z.delivery_fee_cents,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Zones</h1>
      <p className="mt-1 text-sm text-ink-soft">
        §4.1: pausing is the control ops reaches for most — rain, rough sea, a runner walking off.
      </p>
      <ZonesTable zones={zones} />
    </div>
  );
}
