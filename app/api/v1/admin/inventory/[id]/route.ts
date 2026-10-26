import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";
import type { Json } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/** Set the coconuts on hand at a prep point — restocking, or correcting
 * the count after a bad nut. Orders take from this count as they're placed
 * (migration 0022); at zero the beach stops taking orders. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  let body: { qtyAvailable?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const qty = body.qtyAvailable;
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0 || qty > 10_000) {
    return NextResponse.json({ error: "qtyAvailable must be a whole number from 0 to 10000" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: before } = await db.from("inventory").select("qty_available").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "stock row not found" }, { status: 404 });

  const { error } = await db.from("inventory").update({ qty_available: qty, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "STOCK_SET",
    entity: "inventory",
    entity_id: id,
    before: before as Json,
    after: { qty_available: qty } as Json,
  });

  return NextResponse.json({ ok: true });
}
