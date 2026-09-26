import type { Metadata } from "next";
import Link from "next/link";
import { getAdminAnalyticsSummary } from "@/lib/analytics/admin-summary";

export const metadata: Metadata = { title: "Analytics · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const WINDOW_OPTIONS = [7, 14, 30, 90];

function money(cents: number, currency = "USD"): string {
  return `${currency === "USD" ? "US$" : currency + " "}${(cents / 100).toFixed(2)}`;
}

function pct(fraction: number | null): string {
  return fraction === null ? "—" : `${(fraction * 100).toFixed(0)}%`;
}

function minutes(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} min`;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await searchParams;
  const windowDays = WINDOW_OPTIONS.includes(Number(days)) ? Number(days) : 14;
  const summary = await getAdminAnalyticsSummary(windowDays);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-jungle-900">Analytics</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Operational metrics from real order data — the funnel itself lives in PostHog (§18), not queryable here.
          </p>
        </div>
        <nav className="flex gap-1 rounded-full border-2 border-sand-200 p-1" aria-label="Time window">
          {WINDOW_OPTIONS.map((d) => (
            <Link
              key={d}
              href={`/admin/analytics?days=${d}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                d === windowDays ? "bg-jungle-900 text-sand-50" : "text-ink-soft hover:bg-sand-100"
              }`}
            >
              {d}d
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Orders placed" value={String(summary.ordersPlaced)} />
        <Card label="Revenue (paid orders)" value={money(summary.revenueCents)} />
        <Card label="Avg order value" value={money(summary.avgOrderValueCents)} />
        <Card label="Cancellation rate" value={pct(summary.cancellationRate)} />
        <Card label="On-time delivery rate" value={pct(summary.onTimeRate)} sub={`${summary.deliveredCount} delivered`} />
        <Card label="Avg time to accept" value={minutes(summary.avgAcceptMinutes)} sub="placed → runner accepted" />
        <Card label="Delivered" value={String(summary.deliveredCount)} />
        <Card label="Cancelled" value={String(summary.cancelledCount)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="Orders by day">
          {summary.dailyCounts.length === 0 ? (
            <Empty />
          ) : (
            <Table
              head={["Date", "Orders", "Revenue"]}
              rows={summary.dailyCounts.map((d) => [d.date, String(d.orders), money(d.revenueCents)])}
            />
          )}
        </Section>

        <Section title="Fulfillment status breakdown">
          {summary.fulfillmentBreakdown.length === 0 ? (
            <Empty />
          ) : (
            <Table
              head={["Status", "Count"]}
              rows={summary.fulfillmentBreakdown.map((s) => [s.status, String(s.count)])}
            />
          )}
        </Section>

        <Section title="Orders by zone">
          {summary.zoneBreakdown.length === 0 ? (
            <Empty />
          ) : (
            <Table
              head={["Zone", "Orders", "Revenue"]}
              rows={summary.zoneBreakdown.map((z) => [z.zoneName, String(z.orders), money(z.revenueCents)])}
            />
          )}
        </Section>

        <Section title="Cancellation reasons">
          {summary.cancellationReasons.length === 0 ? (
            <Empty label="No cancellations in this window." />
          ) : (
            <Table
              head={["Reason", "Count"]}
              rows={summary.cancellationReasons.map((r) => [r.reason, String(r.count)])}
            />
          )}
        </Section>
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border-2 border-sand-200 p-5">
      <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-bold text-jungle-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 font-display text-lg font-bold text-jungle-900">{title}</h2>
      <div className="overflow-x-auto rounded-card border-2 border-sand-200">{children}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-soft">
        <tr>
          {head.map((h) => (
            <th key={h} className="px-4 py-3">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-sand-200">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-3">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ label = "No orders in this window." }: { label?: string }) {
  return <p className="px-4 py-8 text-center text-sm text-ink-soft">{label}</p>;
}
