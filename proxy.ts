import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on every request under
 * `/admin`, `/runner`, or `/partner` — required by `@supabase/ssr`'s
 * cookie-based session model (server-rendered pages can't refresh a token
 * themselves). Scoped via the matcher below; the customer-facing routes
 * have no session to refresh (§3: "No customer account — guest checkout").
 *
 * Named `proxy`, not `middleware` — this Next.js version renamed the file
 * convention (see AGENTS.md: this is not the Next.js you know).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Touches the session so an expired access token gets refreshed before
  // any page or Route Handler under /admin, /runner, or /partner reads it.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/runner/:path*", "/partner/:path*"],
};
