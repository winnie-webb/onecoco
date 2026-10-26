import type { Metadata } from "next";
import { serverClient } from "@/lib/db/server";
import { getActiveOrders, getAtRiskOrders } from "@/lib/db/queries/admin-orders";
import { OrdersBoard } from "@/components/admin/OrdersBoard";

export const metadata: Metadata = { title: "Orders · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await serverClient();
  const [orders, atRisk] = await Promise.all([getActiveOrders(db), getAtRiskOrders(db)]);

  return <OrdersBoard initialOrders={orders} initialAtRisk={atRisk} />;
}
