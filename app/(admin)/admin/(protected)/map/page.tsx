import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { getBeachCenter, getLiveRunnerPins } from "@/lib/db/queries/admin-map";
import { RunnerMap } from "@/components/admin/RunnerMap";

export const metadata: Metadata = { title: "Live map · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await serverClient();

  const { data: beach } = await db.from("beaches").select("id, name").eq("slug", "doctors-cave-beach").single();
  if (!beach) {
    return <p className="text-ink-soft">No pilot beach configured.</p>;
  }

  const [center, pins] = await Promise.all([getBeachCenter(db, beach.id), getLiveRunnerPins(db, beach.id)]);
  if (!center) return <p className="text-ink-soft">Beach has no centre point.</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">Live map — {beach.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Only runners currently out for delivery appear here — §17: no GPS is collected outside an active delivery.
      </p>
      <div className="mt-6">
        <RunnerMap beachCenter={center} initialPins={pins} />
      </div>
    </div>
  );
}
