import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { cancelOrderAsOps, CancelError } from "@/lib/orders/cancel";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Cancelled by staff";

  try {
    await cancelOrderAsOps(id, reason, guard.session.userId);
  } catch (err) {
    if (err instanceof CancelError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("admin cancel failed", err);
    return NextResponse.json({ error: "could not cancel order" }, { status: 500 });
  }

  await serviceClient().from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "ORDER_CANCELLED",
    entity: "orders",
    entity_id: id,
    after: { reason },
  });

  return NextResponse.json({ ok: true });
}
