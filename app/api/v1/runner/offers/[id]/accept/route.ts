import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { serviceClient } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";

export const dynamic = "force-dynamic";

type AcceptResult = Database["public"]["Enums"]["accept_offer_result"];

const STATUS_BY_RESULT: Record<AcceptResult, number> = {
  ACCEPTED: 200,
  OFFER_NOT_FOUND: 404,
  OFFER_ALREADY_RESOLVED: 409,
  OFFER_EXPIRED: 409,
  ORDER_NOT_AWAITING_RUNNER: 409,
  RUNNER_AT_CAPACITY: 409,
  LOST_RACE: 409,
};

const MESSAGE_BY_RESULT: Record<AcceptResult, string> = {
  ACCEPTED: "accepted",
  OFFER_NOT_FOUND: "offer not found",
  OFFER_ALREADY_RESOLVED: "you already responded to this offer",
  OFFER_EXPIRED: "this offer has expired",
  ORDER_NOT_AWAITING_RUNNER: "this order is no longer available",
  RUNNER_AT_CAPACITY: "you're already at your concurrent-order limit",
  LOST_RACE: "someone got that one first",
};

/** §13 `POST /api/v1/runner/offers/:id/accept` — race-safe accept (§6). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  const db = serviceClient();

  const { data: result, error } = await db.rpc("accept_order_offer", { p_offer_id: id, p_runner_id: guard.session.runnerId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const outcome = result as AcceptResult;
  return NextResponse.json({ result: outcome, message: MESSAGE_BY_RESULT[outcome] }, { status: STATUS_BY_RESULT[outcome] });
}
