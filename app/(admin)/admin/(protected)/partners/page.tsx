import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { PartnersTable, type PartnerRow, type BeachOption } from "@/components/admin/PartnersTable";

export const metadata: Metadata = { title: "Partners · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await serverClient();
  const [partnersRes, beachesRes] = await Promise.all([
    db.from("partners").select("id, name, type, status, commission_rate_bps, beaches(name)").order("name"),
    db.from("beaches").select("id, name").eq("active", true).order("name"),
  ]);
  if (partnersRes.error) throw new Error(partnersRes.error.message);
  if (beachesRes.error) throw new Error(beachesRes.error.message);

  const partners: PartnerRow[] = (partnersRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    status: p.status,
    commissionRateBps: p.commission_rate_bps,
    beachName: (p.beaches as unknown as { name: string } | null)?.name ?? null,
  }));
  const beaches: BeachOption[] = beachesRes.data ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Partners</h1>
      <p className="mt-1 text-sm text-ink-soft">Hotels, tour operators, concierge desks — attributed via QR codes.</p>
      <PartnersTable partners={partners} beaches={beaches} />
    </div>
  );
}
