import type { Metadata } from "next";
import Link from "next/link";
import { serverClient } from "@/lib/db/server";
import { getBeachCenter, getLiveRunnerPins } from "@/lib/db/queries/admin-map";
import { RunnerMap } from "@/components/admin/RunnerMap";

export const metadata: Metadata = { title: "Live map · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ beach?: string }> }) {
  const db = await serverClient();
  const { beach: beachSlug } = await searchParams;

  // §25/Phase 11: "multi-beach expansion, config only" — this page picks
  // whichever beach the query names (or the first active one), rather
  // than assuming there is exactly one, the way it did through Phase 7.
  const { data: beaches, error: beachesError } = await db
    .from("beaches")
    .select("id, name, slug")
    .eq("active", true)
    .order("name");
  if (beachesError) throw new Error(beachesError.message);
  if (!beaches || beaches.length === 0) {
    return <p className="text-ink-soft">No active beach configured.</p>;
  }

  const beach = beaches.find((b) => b.slug === beachSlug) ?? beaches[0];

  const [center, pins] = await Promise.all([getBeachCenter(db, beach.id), getLiveRunnerPins(db, beach.id)]);
  if (!center) return <p className="text-ink-soft">Beach has no centre point.</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-jungle-900">Live map — {beach.name}</h1>
        {beaches.length > 1 && (
          <nav className="flex gap-1 rounded-full border-2 border-sand-200 p-1" aria-label="Beach">
            {beaches.map((b) => (
              <Link
                key={b.id}
                href={`/admin/map?beach=${b.slug}`}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  b.id === beach.id ? "bg-jungle-900 text-sand-50" : "text-ink-soft hover:bg-sand-100"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Only runners currently out for delivery appear here — §17: no GPS is collected outside an active delivery.
      </p>
      <div className="mt-6">
        <RunnerMap beachCenter={center} initialPins={pins} />
      </div>
    </div>
  );
}
