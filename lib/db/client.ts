import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

/**
 * Two clients, deliberately not interchangeable (§16, §10).
 *
 * `serviceClient()` — service-role key, bypasses RLS entirely. Used only in
 * server Route Handlers, which are trusted to authorise the caller
 * themselves. Never imported into a Client Component; the key would end up
 * in the browser bundle.
 *
 * `anonClient()` — anon key, subject to RLS. Safe in a Server Component
 * because it can read only what the public policies allow — the same
 * catalogue and geography the marketing pages already publish.
 */

let cachedService: SupabaseClient<Database> | null = null;
let cachedAnon: SupabaseClient<Database> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and point it at a Supabase project (local: \`npx supabase start\`).`,
    );
  }
  return value;
}

export function serviceClient(): SupabaseClient<Database> {
  if (cachedService) return cachedService;
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  cachedService = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedService;
}

export function anonClient(): SupabaseClient<Database> {
  if (cachedAnon) return cachedAnon;
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  cachedAnon = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnon;
}
