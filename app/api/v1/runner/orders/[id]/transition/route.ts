import { NextResponse } from "next/server";
import { requireRunnerApi } from "@/lib/auth/runner-guards";
import { applyRunnerTransition, RunnerTransitionError, type RunnerAction } from "@/lib/orders/runner-transition";
import { IllegalTransitionError } from "@/lib/orders/state";

export const dynamic = "force-dynamic";

const VALID_ACTIONS = new Set<RunnerAction>(["PICKED_UP", "ARRIVING", "DELIVERED", "UNDELIVERABLE"]);

interface TransitionBody {
  action?: unknown;
  deliveryCode?: unknown;
  deliveryPhotoUrl?: unknown;
  occurredAt?: unknown;
  reason?: unknown;
}

const ERROR_STATUS: Record<string, number> = {
  NOT_ASSIGNED: 403,
  NOT_FOUND: 404,
  WRONG_STATE: 409,
  CODE_MISMATCH: 400,
};

/** §13 `POST /api/v1/runner/orders/:id/transition` — guarded, per §11's flow. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireRunnerApi();
  if ("response" in guard) return guard.response;

  const { id } = await context.params;
  let body: TransitionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.action !== "string" || !VALID_ACTIONS.has(body.action as RunnerAction)) {
    return NextResponse.json({ error: "action must be one of PICKED_UP, ARRIVING, DELIVERED, UNDELIVERABLE" }, { status: 400 });
  }

  try {
    await applyRunnerTransition({
      orderId: id,
      runnerId: guard.session.runnerId,
      action: body.action as RunnerAction,
      deliveryCode: typeof body.deliveryCode === "string" ? body.deliveryCode : undefined,
      deliveryPhotoUrl: typeof body.deliveryPhotoUrl === "string" ? body.deliveryPhotoUrl : undefined,
      occurredAt: typeof body.occurredAt === "string" ? body.occurredAt : undefined,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RunnerTransitionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: ERROR_STATUS[err.code] ?? 400 });
    }
    if (err instanceof IllegalTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("runner transition failed", err);
    return NextResponse.json({ error: "transition failed" }, { status: 500 });
  }
}
