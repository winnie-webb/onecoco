import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/db/server";

export interface RunnerSession {
  userId: string;
  runnerId: string;
  name: string;
  homeBeachId: string | null;
  shiftStatus: string;
}

async function loadRunnerSession(): Promise<RunnerSession | "NO_SESSION" | "NOT_RUNNER"> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "NO_SESSION";

  const { data: appUser } = await supabase.from("app_users").select("role, active").eq("id", user.id).single();
  if (!appUser || !appUser.active || appUser.role !== "RUNNER") return "NOT_RUNNER";

  const { data: runner } = await supabase
    .from("runners")
    .select("id, name, home_beach_id, shift_status, active")
    .eq("user_id", user.id)
    .single();
  if (!runner || !runner.active) return "NOT_RUNNER";

  return { userId: user.id, runnerId: runner.id, name: runner.name, homeBeachId: runner.home_beach_id, shiftStatus: runner.shift_status };
}

/** Server Component guard — mirrors `requireStaffSession` for the runner
 * role, checking the same thing `runner_self` (0007_rls.sql) checks. */
export async function requireRunnerSession(): Promise<RunnerSession> {
  const session = await loadRunnerSession();
  if (session === "NOT_RUNNER") redirect("/runner/login?error=not_runner");
  if (session === "NO_SESSION") redirect("/runner/login");
  return session;
}

/** Route Handler guard — 401/403 JSON instead of a redirect. */
export async function requireRunnerApi(): Promise<{ session: RunnerSession } | { response: NextResponse }> {
  const session = await loadRunnerSession();
  if (typeof session === "string") {
    const status = session === "NO_SESSION" ? 401 : 403;
    return { response: NextResponse.json({ error: "not signed in as a runner" }, { status }) };
  }
  return { session };
}
