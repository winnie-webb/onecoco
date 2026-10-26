import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";

/**
 * The authenticated-user client for Server Components and Route Handlers
 * under `(admin)` — subject to RLS as the signed-in `app_users` row, not
 * the service-role bypass. Staff pages should read/write through this so
 * `staff_all_*` / `runner_own_*` policies (0007_rls.sql) are the actual
 * access control, matching §16 ("RLS is the access control, not a second
 * line of defence").
 */
export async function serverClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies — the
            // middleware below refreshes the session on the next request.
          }
        },
      },
    },
  );
}
