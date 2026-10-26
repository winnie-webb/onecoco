import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<Database["public"]["Enums"]["partner_type"]>([
  "HOTEL",
  "RESORT",
  "TOUR_OPERATOR",
  "RESTAURANT",
  "EVENT_PLANNER",
  "OTHER",
]);

interface CreatePartnerBody {
  name?: unknown;
  type?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  beachId?: unknown;
  commissionRateBps?: unknown;
}

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  let body: CreatePartnerBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof body.type !== "string" || !VALID_TYPES.has(body.type as Database["public"]["Enums"]["partner_type"])) {
    return NextResponse.json({ error: "a valid type is required" }, { status: 400 });
  }
  const commissionRateBps = Number(body.commissionRateBps ?? 0);
  if (!Number.isInteger(commissionRateBps) || commissionRateBps < 0 || commissionRateBps > 10_000) {
    return NextResponse.json({ error: "commissionRateBps must be an integer between 0 and 10000" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: partner, error } = await db
    .from("partners")
    .insert({
      name: body.name.trim(),
      type: body.type as Database["public"]["Enums"]["partner_type"],
      contact_email: typeof body.contactEmail === "string" ? body.contactEmail : null,
      contact_phone: typeof body.contactPhone === "string" ? body.contactPhone : null,
      beach_id: typeof body.beachId === "string" ? body.beachId : null,
      commission_rate_bps: commissionRateBps,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (error || !partner) return NextResponse.json({ error: error?.message ?? "could not create partner" }, { status: 500 });

  await db.from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "PARTNER_CREATED",
    entity: "partners",
    entity_id: partner.id,
    after: { name: body.name, type: body.type },
  });

  return NextResponse.json({ partnerId: partner.id }, { status: 201 });
}
