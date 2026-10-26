/**
 * Audit T-14, minimum viable: push an alert to a chat webhook when
 * something needs a human — an unhandled server error, a failed refund, a
 * failed sweep. `ALERT_WEBHOOK_URL` takes any endpoint that accepts
 * `{"text": "..."}` (Slack incoming webhook; Discord with `/slack` on the
 * end). Unset means console only.
 *
 * Never throws and never includes customer PII — order ids and error
 * messages only, so the alert channel isn't a second copy of the database.
 */
export async function alert(text: string): Promise<void> {
  console.error(`[alert] ${text}`);
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `[${process.env.VERCEL_ENV ?? process.env.NODE_ENV}] ${text}`.slice(0, 3000) }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    console.error("[alert] delivery failed", err);
  }
}
