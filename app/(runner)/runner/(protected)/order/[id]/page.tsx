import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRunnerSession } from "@/lib/auth/runner-guards";
import { serverClient } from "@/lib/db/server";
import { ActiveDelivery, type OrderDetail } from "@/components/runner/ActiveDelivery";

export const metadata: Metadata = { title: "Delivery" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRunnerSession();
  const { id } = await params;
  const db = await serverClient();

  // RLS (`runner_assigned_orders`, 0007_rls.sql) already restricts this to
  // orders actively assigned to the signed-in runner — a not-found here
  // means either the order doesn't exist or isn't theirs, and both should
  // look the same to them.
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, fulfillment_status, landmark_text, customer_description, contact_phone, total_cents, currency, payment_status, arriving_announced_at")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const detail: OrderDetail = {
    orderId: order.id,
    orderNumber: order.order_number,
    fulfillmentStatus: order.fulfillment_status,
    landmarkText: order.landmark_text,
    customerDescription: order.customer_description,
    contactPhone: order.contact_phone,
    totalCents: order.total_cents,
    currency: order.currency,
    cashDue: order.payment_status === "CASH_DUE",
    arrivingAnnounced: order.arriving_announced_at != null,
  };

  return <ActiveDelivery order={detail} />;
}
