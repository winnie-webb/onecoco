import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function POST() {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  if (!session.homeBeachId) {
    return NextResponse.json({ error: "runner has no home beach assigned" }, { status: 400 });
  }

  const db = serviceClient();
  const { error: shiftError } = await db.from("shifts").insert({ runner_id: session.runnerId, beach_id: session.homeBeachId });
  if (shiftError) {
    // shifts_one_open_per_runner — starting a shift while one is already open.
    if (shiftError.code === "23505") return NextResponse.json({ error: "a shift is already open" }, { status: 409 });
    return NextResponse.json({ error: shiftError.message }, { status: 500 });
  }

  await db.from("runners").update({ shift_status: "AVAILABLE", device_last_seen_at: new Date().toISOString() }).eq("id", session.runnerId);

  return NextResponse.json({ ok: true });
}
