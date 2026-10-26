import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function POST() {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const db = serviceClient();
  const { error } = await db
    .from("shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("runner_id", session.runnerId)
    .is("ended_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("runners").update({ shift_status: "OFF_SHIFT" }).eq("id", session.runnerId);

  return NextResponse.json({ ok: true });
}
