import { NextResponse } from "next/server";
import { serverClient } from "@/lib/db/server";
import { isStaffRole } from "@/lib/auth/roles";
import type { StaffSession } from "@/lib/auth/guards";

/**
 * The Route Handler counterpart to `requireStaffSession()` — that one
 * calls `redirect()`, which is for rendering a page, not for an API route
 * that owes the caller JSON. Same check, a 401/403 response instead of a
 * redirect.
 */
export async function requireStaffApi(): Promise<{ session: StaffSession } | { response: NextResponse }> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: "not signed in" }, { status: 401 }) };
  }

  const { data: appUser } = await supabase.from("app_users").select("email, role, display_name, active").eq("id", user.id).single();

  if (!appUser || !appUser.active || !isStaffRole(appUser.role)) {
    return { response: NextResponse.json({ error: "not staff" }, { status: 403 }) };
  }

  return { session: { userId: user.id, email: appUser.email, role: appUser.role, displayName: appUser.display_name } };
}
