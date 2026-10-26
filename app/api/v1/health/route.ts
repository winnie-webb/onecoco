import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * Audit T-14: target for an external uptime check (UptimeRobot, Better
 * Stack…). 200 only if the app can reach the database; 503 otherwise.
 * Reveals nothing beyond up/down.
 */
export async function GET() {
  try {
    const { error } = await serviceClient().from("settings").select("key").limit(1);
    if (error) return NextResponse.json({ ok: false }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
