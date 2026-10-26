import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * §13 `POST /api/v1/runner/heartbeat` — liveness (§4.5: "status is a claim
 * made at a past instant; liveness is a separate signal"). Feeds
 * `orders_at_risk`'s `RUNNER_SIGNAL_STALE` check (0010_at_risk_view.sql).
 */
export async function POST() {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;

  await serviceClient()
    .from("runners")
    .update({ device_last_seen_at: new Date().toISOString() })
    .eq("id", guard.session.runnerId);

  return NextResponse.json({ ok: true });
}
