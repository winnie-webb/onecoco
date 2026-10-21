import type { Instrumentation } from "next";

/**
 * Audit T-14: every uncaught server error (render, route handler, proxy)
 * reaches the alert channel. Request headers are deliberately not sent —
 * they carry session cookies.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { alert } = await import("@/lib/monitoring/alert");
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? ` (digest ${String(err.digest)})` : "";
  await alert(`Server error on ${request.method} ${request.path.split("?")[0]} [${context.routeType}]: ${message}${digest}`);
};
