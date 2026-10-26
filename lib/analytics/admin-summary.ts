import { serverClient } from "@/lib/db/server";

/**
 * §18: PostHog owns the client-side funnel (visit → … → delivered), but
 * it's an external no-op sink in this sandbox (§22) and, live, its data
 * never lands anywhere this codebase can query. Everything here instead
 * reads real operational data already sitting on `orders`/
 * `order_assignments` — placed/delivered/cancelled timestamps, the promised
 * ETA window, the accept deadline — none of it needs a separate events
 * table (`order_events` records status *transitions*, useful for a single
 * order's audit trail, not this kind of aggregate).
 */

const PAID_STATUSES = new Set(["CAPTURED", "CASH_COLLECTED", "PARTIALLY_REFUNDED", "REFUNDED"]);

export interface DailyCount {
  date: string;
  orders: number;
  revenueCents: number;
}

export interface ZoneBreakdown {
  zoneId: string;
  zoneName: string;
  orders: number;
  revenueCents: number;
}

export interface ReasonBreakdown {
  reason: string;
  count: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

export interface AdminAnalyticsSummary {
  windowDays: number;
  ordersPlaced: number;
  revenueCents: number;
  avgOrderValueCents: number;
  deliveredCount: number;
  cancelledCount: number;
  cancellationRate: number | null;
  onTimeRate: number | null;
  avgAcceptMinutes: number | null;
  fulfillmentBreakdown: StatusBreakdown[];
  cancellationReasons: ReasonBreakdown[];
  dailyCounts: DailyCount[];
  zoneBreakdown: ZoneBreakdown[];
}

interface OrderRow {
  id: string;
  placed_at: string;
  fulfillment_status: string;
  payment_status: string;
  total_cents: number;
  delivered_at: string | null;
  promised_eta_max_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  zone_id: string;
  delivery_zones: { name: string } | null;
  order_assignments: { assigned_at: string }[] | null;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function getAdminAnalyticsSummary(windowDays: number): Promise<AdminAnalyticsSummary> {
  const db = await serverClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("orders")
    .select(
      "id, placed_at, fulfillment_status, payment_status, total_cents, delivered_at, promised_eta_max_at, cancelled_at, cancellation_reason, zone_id, delivery_zones(name), order_assignments(assigned_at)",
    )
    .gte("placed_at", since)
    .order("placed_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as OrderRow[];

  let revenueCents = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let onTimeCount = 0;
  let onTimeEligible = 0;
  let acceptMinutesSum = 0;
  let acceptEligible = 0;

  const fulfillmentCounts = new Map<string, number>();
  const cancellationReasons = new Map<string, number>();
  const dailyMap = new Map<string, { orders: number; revenueCents: number }>();
  const zoneMap = new Map<string, { zoneName: string; orders: number; revenueCents: number }>();

  for (const row of rows) {
    const paid = PAID_STATUSES.has(row.payment_status);
    if (paid) revenueCents += row.total_cents;

    fulfillmentCounts.set(row.fulfillment_status, (fulfillmentCounts.get(row.fulfillment_status) ?? 0) + 1);

    if (row.fulfillment_status === "DELIVERED") {
      deliveredCount += 1;
      if (row.delivered_at && row.promised_eta_max_at) {
        onTimeEligible += 1;
        if (new Date(row.delivered_at).getTime() <= new Date(row.promised_eta_max_at).getTime()) onTimeCount += 1;
      }
    }

    if (row.fulfillment_status === "CANCELLED") {
      cancelledCount += 1;
      const reason = row.cancellation_reason ?? "(none given)";
      cancellationReasons.set(reason, (cancellationReasons.get(reason) ?? 0) + 1);
    }

    const assignments = row.order_assignments ?? [];
    if (assignments.length > 0) {
      const firstAssignedAt = assignments.map((a) => new Date(a.assigned_at).getTime()).sort((a, b) => a - b)[0];
      const minutes = (firstAssignedAt - new Date(row.placed_at).getTime()) / 60_000;
      if (minutes >= 0) {
        acceptMinutesSum += minutes;
        acceptEligible += 1;
      }
    }

    const day = dayKey(row.placed_at);
    const dayEntry = dailyMap.get(day) ?? { orders: 0, revenueCents: 0 };
    dayEntry.orders += 1;
    if (paid) dayEntry.revenueCents += row.total_cents;
    dailyMap.set(day, dayEntry);

    const zoneEntry = zoneMap.get(row.zone_id) ?? {
      zoneName: row.delivery_zones?.name ?? "(unknown zone)",
      orders: 0,
      revenueCents: 0,
    };
    zoneEntry.orders += 1;
    if (paid) zoneEntry.revenueCents += row.total_cents;
    zoneMap.set(row.zone_id, zoneEntry);
  }

  const ordersPlaced = rows.length;

  return {
    windowDays,
    ordersPlaced,
    revenueCents,
    avgOrderValueCents: ordersPlaced > 0 ? Math.round(revenueCents / ordersPlaced) : 0,
    deliveredCount,
    cancelledCount,
    cancellationRate: ordersPlaced > 0 ? cancelledCount / ordersPlaced : null,
    onTimeRate: onTimeEligible > 0 ? onTimeCount / onTimeEligible : null,
    avgAcceptMinutes: acceptEligible > 0 ? acceptMinutesSum / acceptEligible : null,
    fulfillmentBreakdown: [...fulfillmentCounts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    cancellationReasons: [...cancellationReasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    dailyCounts: [...dailyMap.entries()]
      .map(([date, v]) => ({ date, orders: v.orders, revenueCents: v.revenueCents }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    zoneBreakdown: [...zoneMap.entries()]
      .map(([zoneId, v]) => ({ zoneId, zoneName: v.zoneName, orders: v.orders, revenueCents: v.revenueCents }))
      .sort((a, b) => b.orders - a.orders),
  };
}
