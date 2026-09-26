/**
 * §18's funnel, instrumented from Phase 2 so it has history when growth work
 * starts — "a funnel added later has no history."
 *
 * PostHog for funnels; `order_events` (Postgres, written by trigger) stays
 * the source of truth for anything operational. This module is deliberately
 * NOT the `posthog-js` SDK — that's ~50KB gzipped for a handful of explicit
 * `capture()` calls, and the customer path's JS budget is already over
 * (PHASE-1-NOTES.md). A bare `fetch` to PostHog's capture endpoint costs
 * nothing when `NEXT_PUBLIC_POSTHOG_KEY` is unset, which is the honest state
 * right now (§22: no PostHog account yet) — every call below no-ops.
 */

export type FunnelEvent =
  | "visit"
  | "get_coco_click"
  | "location_granted"
  | "location_denied"
  | "in_zone"
  | "out_of_zone"
  | "serviceable"
  | "not_serviceable"
  | "product_selected"
  | "checkout_started"
  | "payment_succeeded"
  | "delivered";

const POSTHOG_KEY =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_POSTHOG_KEY : undefined;
const POSTHOG_HOST =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_POSTHOG_HOST : undefined) ??
  "https://us.i.posthog.com";

function distinctId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const key = "oc_distinct_id";
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function track(event: FunnelEvent, properties: Record<string, unknown> = {}): void {
  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics no-op]", event, properties);
    }
    return;
  }

  const body = JSON.stringify({
    api_key: POSTHOG_KEY,
    event,
    distinct_id: distinctId(),
    properties,
    timestamp: new Date().toISOString(),
  });

  // fire-and-forget; a dropped analytics event is never allowed to break the
  // customer flow.
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
