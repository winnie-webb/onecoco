/**
 * §16: "Rate limits on /orders, /quote, /demand, /track." A bare in-memory
 * sliding window — correct for the single-instance MVP this codebase is at
 * (no Redis dependency yet), wrong the moment this runs on more than one
 * server process. Flagged here rather than silently assumed: swap this
 * module's internals for a shared store (Upstash/Redis) before any
 * multi-instance deploy.
 */

const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  buckets.set(key, timestamps);
  return timestamps.length > limit;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
