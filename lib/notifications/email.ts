import type { EmailContent } from "@/lib/notifications/templates/order";

/**
 * §22: "Resend (or similar) — Transactional email — Mockable? Yes —
 * console sink." Not verified against a real Resend account — this
 * sandbox's network egress rejects `api.resend.com` outright (organization
 * policy, confirmed via a direct connectivity check), on top of there
 * being no account yet. `buildResendRequest` is pure and unit-tested;
 * `sendEmail` itself has never made a live call. See PHASE-5-NOTES.md.
 */

export interface SendEmailResult {
  ok: boolean;
  providerRef?: string;
  error?: string;
}

/** Pure — no network. Exported so the request shape can be unit tested. */
export function buildResendRequest(to: string, content: EmailContent, from: string): { url: string; init: RequestInit } {
  return {
    url: "https://api.resend.com/emails",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject: content.subject, html: content.html }),
    },
  };
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendEmail(to: string, content: EmailContent): Promise<SendEmailResult> {
  if (!isEmailConfigured()) return { ok: false, error: "RESEND_API_KEY/RESEND_FROM not configured" };

  const { url, init } = buildResendRequest(to, content, process.env.RESEND_FROM!);
  try {
    const res = await fetch(url, init);
    const body = await res.json();
    if (!res.ok) return { ok: false, error: `Resend returned ${res.status}: ${JSON.stringify(body)}` };
    return { ok: true, providerRef: body.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
