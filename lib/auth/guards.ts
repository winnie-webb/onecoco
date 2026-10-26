import { redirect } from "next/navigation";
import { serverClient } from "@/lib/db/server";
import { isStaffRole, type AppRole } from "@/lib/auth/roles";

export interface StaffSession {
  userId: string;
  email: string;
  role: AppRole;
  displayName: string | null;
}

/**
 * Every `(admin)` Server Component calls this first. Redirects to
 * `/admin/login` for no session, an inactive `app_users` row, or a role
 * outside `ADMIN`/`OPS` (a runner or partner account signed into the wrong
 * door) — same shape of check as `current_app_role()`/`is_staff()` in
 * 0007_rls.sql, so a page's own gate and the database's RLS policies agree
 * on who staff is.
 */
export async function requireStaffSession(): Promise<StaffSession> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("email, role, display_name, active")
    .eq("id", user.id)
    .single();

  if (!appUser || !appUser.active || !isStaffRole(appUser.role)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_staff");
  }

  return { userId: user.id, email: appUser.email, role: appUser.role, displayName: appUser.display_name };
}
