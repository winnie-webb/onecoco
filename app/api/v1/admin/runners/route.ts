import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/api-guard";
import { serviceClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface CreateRunnerBody {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  homeBeachId?: unknown;
}

/**
 * Creates a real Supabase Auth user for the runner via the service-role
 * admin API — no invite email, since there's no Resend account yet (§22,
 * Phase 5). The one-time temporary password is returned so staff can relay
 * it out of band; it is never stored or logged anywhere past this response.
 */
export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  let body: CreateRunnerBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.name !== "string" || !body.name.trim() || typeof body.email !== "string" || !body.email.includes("@")) {
    return NextResponse.json({ error: "name and a valid email are required" }, { status: 400 });
  }
  if (typeof body.homeBeachId !== "string") {
    return NextResponse.json({ error: "homeBeachId is required" }, { status: 400 });
  }

  const db = serviceClient();
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
    display_name: body.name.trim(),
    role: "RUNNER",
  });
  if (appUserError) {
    await db.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: appUserError.message }, { status: 500 });
  }

  const { data: runner, error: runnerError } = await db
    .from("runners")
    .insert({
      user_id: created.user.id,
      name: body.name.trim(),
      phone: typeof body.phone === "string" ? body.phone : null,
      home_beach_id: body.homeBeachId,
    })
    .select("id")
    .single();
  if (runnerError || !runner) {
    await db.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: runnerError?.message ?? "could not create runner" }, { status: 500 });
  }

  await db.from("audit_log").insert({
    actor_user_id: guard.session.userId,
    action: "RUNNER_CREATED",
    entity: "runners",
    entity_id: runner.id,
    after: { email: created.user.email, name: body.name },
  });

  return NextResponse.json({ runnerId: runner.id, email: created.user.email, tempPassword }, { status: 201 });
}
