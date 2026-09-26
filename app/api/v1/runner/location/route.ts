import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface LocationBody {
  orderId?: unknown;
  lat?: unknown;
  lng?: unknown;
  accuracyM?: unknown;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * §17: "No runner location collected at all in the MVP. When it arrives in
 * Phase 7 it's collected only during an active delivery, with its own
 * short retention." Enforced here, not just by the client only calling
 * this while `OUT_FOR_DELIVERY` — the lookup below requires a live,
 * unreleased assignment, and `runner_own_location_insert` (0015) enforces
 * the same thing again at the RLS layer for anyone bypassing this route.
 */
export async function POST(request: Request) {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;

  let body: LocationBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body.orderId !== "string" || !isFiniteNumber(body.lat) || !isFiniteNumber(body.lng)) {
    return NextResponse.json({ error: "orderId, lat and lng are required" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: assignment } = await db
    .from("order_assignments")
    .select("id")
    .eq("order_id", body.orderId)
    .eq("runner_id", guard.session.runnerId)
    .is("released_at", null)
    .maybeSingle();
  if (!assignment) {
    return NextResponse.json({ error: "no active assignment for this order" }, { status: 403 });
  }

  const { error } = await db.from("runner_locations").insert({
    runner_id: guard.session.runnerId,
    assignment_id: assignment.id,
    point: `POINT(${body.lng} ${body.lat})`,
    accuracy_m: isFiniteNumber(body.accuracyM) ? body.accuracyM : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
