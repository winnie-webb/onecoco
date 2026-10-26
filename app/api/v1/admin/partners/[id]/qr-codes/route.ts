import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface CreateQrBody {
  placementLabel?: unknown;
  beachId?: unknown;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  let body: CreateQrBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const db = serviceClient();
  // Short, URL-friendly, not sequential/guessable (§16's general posture on
  // tokens, applied here too even though a QR code's worst case is just a
  // misattributed order, not a security breach).
  const code = crypto.randomBytes(5).toString("base64url");

  const { data: qr, error } = await db
    .from("qr_codes")
    .insert({
      code,
      partner_id: id,
      beach_id: typeof body.beachId === "string" ? body.beachId : null,
      placement_label: typeof body.placementLabel === "string" ? body.placementLabel : null,
    })
    .select("id, code")
    .single();
  if (error || !qr) return NextResponse.json({ error: error?.message ?? "could not create QR code" }, { status: 500 });

  await db.from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "QR_CODE_CREATED",
    entity: "qr_codes",
    entity_id: qr.id,
    after: { partner_id: id, code },
  });

  return NextResponse.json({ qrCodeId: qr.id, code: qr.code }, { status: 201 });
}
