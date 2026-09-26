import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { RunnersTable, type RunnerRow, type BeachOption } from "@/components/admin/RunnersTable";

export const metadata: Metadata = { title: "Runners · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await serverClient();
  const [runnersRes, beachesRes] = await Promise.all([
    db.from("runners").select("id, name, phone, shift_status, active, beaches(name)").order("name"),
    db.from("beaches").select("id, name").eq("active", true).order("name"),
  ]);
  if (runnersRes.error) throw new Error(runnersRes.error.message);
  if (beachesRes.error) throw new Error(beachesRes.error.message);

  const runners: RunnerRow[] = (runnersRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    shiftStatus: r.shift_status,
    active: r.active,
    homeBeachName: (r.beaches as unknown as { name: string } | null)?.name ?? null,
  }));
  const beaches: BeachOption[] = beachesRes.data ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Runners</h1>
      <p className="mt-1 text-sm text-ink-soft">Shift start/stop and offers are the Phase 6 runner app — this is roster management.</p>
      <RunnersTable runners={runners} beaches={beaches} />
    </div>
  );
}
