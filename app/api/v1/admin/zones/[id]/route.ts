import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";
import type { Database, Json } from "@/lib/db/types";

export const dynamic = "force-dynamic";

interface ZoneUpdateBody {
  serviceStatus?: unknown;
  pauseReason?: unknown;
  pauseUntil?: unknown;
}

type ServiceStatus = Database["public"]["Enums"]["zone_service_status"];
const VALID_STATUS = new Set<ServiceStatus>(["OPEN", "PAUSED", "CLOSED"]);

function isValidStatus(value: unknown): value is ServiceStatus {
  return typeof value === "string" && VALID_STATUS.has(value as ServiceStatus);
}

/**
 * §4.1: "`service_status = PAUSED` is the single most-used control in a
 * real delivery ops console." No transition guard here — unlike order
 * status, zone service_status isn't one of the three tracks in
 * lib/orders/state.ts; any status can move to any other at ops' direction
 * (opening, pausing, and re-closing a zone are all legitimate at any time).
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  let body: ZoneUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!isValidStatus(body.serviceStatus)) {
    return NextResponse.json({ error: "serviceStatus must be OPEN, PAUSED, or CLOSED" }, { status: 400 });
  }
  const pauseReason = typeof body.pauseReason === "string" ? body.pauseReason : null;
  const pauseUntil = typeof body.pauseUntil === "string" ? body.pauseUntil : null;

  const db = serviceClient();
  const { data: before } = await db.from("delivery_zones").select("service_status, pause_reason, pause_until").eq("id", id).single();

  const { error } = await db
    .from("delivery_zones")
    .update({ service_status: body.serviceStatus, pause_reason: pauseReason, pause_until: pauseUntil })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "ZONE_STATUS_CHANGED",
    entity: "delivery_zones",
    entity_id: id,
    before: before as Json,
    after: { service_status: body.serviceStatus, pause_reason: pauseReason, pause_until: pauseUntil } as Json,
  });

  return NextResponse.json({ ok: true });
}
