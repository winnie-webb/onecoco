import Link from "next/link";
import type { Metadata } from "next";
import { requireRunnerSession } from "@/lib/auth/runner-guards";
import { serverClient } from "@/lib/db/server";
import { ShiftControls } from "@/components/runner/ShiftControls";
import { FULFILLMENT_COPY } from "@/lib/orders/copy";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requireRunnerSession();
  const db = await serverClient();

  const { data: assignments } = await db
    .from("order_assignments")
    .select("order_id, orders(order_number, fulfillment_status, landmark_text)")
    .eq("runner_id", session.runnerId)
    .is("released_at", null);

  const activeOrders = (assignments ?? [])
    .map((a) => a.orders as unknown as { order_number: number; fulfillment_status: string; landmark_text: string | null } | null)
    .filter((o): o is NonNullable<typeof o> => o != null);

  return (
    <div className="mx-auto max-w-md">
      <ShiftControls initialShiftStatus={session.shiftStatus} />

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-soft">Your deliveries</h2>
      {activeOrders.length === 0 && <p className="mt-2 text-ink-soft">Nothing assigned right now.</p>}
      <div className="mt-3 flex flex-col gap-3">
        {(assignments ?? []).map((a) => {
          const order = a.orders as unknown as { order_number: number; fulfillment_status: string; landmark_text: string | null } | null;
          if (!order) return null;
          return (
            <Link
              key={a.order_id}
              href={`/runner/order/${a.order_id}`}
              className="rounded-card border-2 border-sand-200 p-4 hover:border-jungle-800"
            >
              <p className="font-semibold text-jungle-900">
                #{order.order_number} — {FULFILLMENT_COPY[order.fulfillment_status as keyof typeof FULFILLMENT_COPY]}
              </p>
              {order.landmark_text && <p className="text-sm text-ink-soft">{order.landmark_text}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
