import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface InviteBody {
  email?: unknown;
}

/** Same pattern as `POST /api/v1/admin/runners` — a real Supabase Auth user
 * via the service-role admin API, no invite email (no Resend account yet,
 * Phase 5), a one-time temporary password returned for staff to relay. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  let body: InviteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body.email !== "string" || !body.email.includes("@")) {
    return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: partner } = await db.from("partners").select("id, name").eq("id", id).single();
  if (!partner) return NextResponse.json({ error: "partner not found" }, { status: 404 });

  const tempPassword = crypto.randomBytes(12).toString("base64url");
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: body.email.trim().toLowerCase(),
    password: tempPassword,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "could not create auth user" }, { status: 400 });
  }

  const { error: appUserError } = await db.from("app_users").insert({
    id: created.user.id,
    email: created.user.email!,
    display_name: partner.name,
    role: "PARTNER",
  });
  if (appUserError) {
    await db.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: appUserError.message }, { status: 500 });
  }

  const { error: linkError } = await db.from("partner_users").insert({ partner_id: partner.id, user_id: created.user.id, role: "OWNER" });
  if (linkError) {
    await db.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  await db.from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "PARTNER_USER_INVITED",
    entity: "partner_users",
    entity_id: partner.id,
    after: { email: created.user.email },
  });

  return NextResponse.json({ email: created.user.email, tempPassword }, { status: 201 });
}
