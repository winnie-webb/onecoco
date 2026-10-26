import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";
import type { Database, Json } from "@/lib/db/types";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export const dynamic = "force-dynamic";

interface ProductUpdateBody {
  basePriceCents?: unknown;
  active?: unknown;
}

/** README convention: "no price is ever a literal in application code." This
 * is the one place a price is allowed to change — audited, staff-only. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  let body: ProductUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const update: ProductUpdate = {};
  if (body.basePriceCents !== undefined) {
    if (typeof body.basePriceCents !== "number" || !Number.isInteger(body.basePriceCents) || body.basePriceCents < 0) {
      return NextResponse.json({ error: "basePriceCents must be a non-negative integer" }, { status: 400 });
    }
    update.base_price_cents = body.basePriceCents;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
    }
    update.active = body.active;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: before } = await db.from("products").select("base_price_cents, active").eq("id", id).single();

  const { error } = await db.from("products").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "PRODUCT_UPDATED",
    entity: "products",
    entity_id: id,
    before: before as Json,
    after: update as Json,
  });

  return NextResponse.json({ ok: true });
}
