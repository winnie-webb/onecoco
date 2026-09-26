"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";

/** The client-side counterpart to `lib/db/server.ts` — sign-in, sign-out,
 * and the admin order board's Realtime subscription (§3: "Supabase Realtime
 * for authenticated staff only" — this is the one place in the app that's
 * true for). */
export function browserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
