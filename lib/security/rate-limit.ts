import { serviceClient } from "@/lib/db/client";

/**
 * §16: "Rate limits on /orders, /quote, /demand, /track." Shared across
 * every server instance via a Postgres counter (migration 0021,
 * `rate_limit_hit`) — audit T-9: the previous in-memory map was
 * per-lambda on Vercel, i.e. no limit at all.
 *
 * Fails OPEN: if the limiter itself errors, the request goes through. A
 * broken limiter must not stop a tourist from ordering; abuse during a
 * database incident is the lesser problem.
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { data, error } = await serviceClient().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.round(windowMs / 1000)),
    });
    if (error) {
      console.error("[rate-limit] check failed, allowing request", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request", err);
    return false;
  }
}

/**
 * The caller's IP. On Vercel, `x-vercel-forwarded-for` / `x-real-ip` are set
 * by the platform and can't be supplied by the client; a raw
 * `x-forwarded-for` can, so it's only the last resort (local dev, other hosts).
 */
export function clientIp(request: Request): string {
  const platform = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip");
  if (platform) return platform.split(",")[0].trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
