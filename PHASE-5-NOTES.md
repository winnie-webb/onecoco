# Phase 5 — Real Payments (PayPal), Webhooks, Refunds, Email

## The honest headline

**This phase's PayPal and Resend code has never made a successful live API
call, and cannot, from this development environment.** It's not just "no
account yet" (§22's documented blocker) — a direct connectivity check found
this sandbox's network egress policy rejects both hosts outright:

```
curl https://api-m.sandbox.paypal.com/v1/oauth2/token → connect_rejected
curl https://api.resend.com/emails                    → connect_rejected
```

(the agent proxy's own status endpoint confirms these as organization
policy denials, not transient failures — see the proxy README's guidance
not to retry or route around a 403/407 class rejection).

Given that, this phase did the part that's actually possible responsibly:
write both integrations faithful to their providers' public API contracts,
isolate every piece of genuinely pure logic (no network) into its own
function, and **unit test those pieces for real** rather than claiming
untestable code works. Everything below that says "tested" was run;
everything that says "written, not verified" was not, and is called out by
name rather than left implicit.

## Completed

- **`lib/payments/paypal.ts`** — the `PaymentProvider` interface (§8)
  implemented against PayPal Orders v2: OAuth2 client-credentials token
  exchange, order creation with `custom_id`/`invoice_id` set to our order
  id and `PayPal-Request-Id` for provider-side idempotency (§8), capture,
  and refund. `parseCaptureResponse` — the response-to-`CaptureOutcome`
  mapping, including §8 check 1 (binding: `custom_id` must equal the order
  id we issued) at this layer, ahead of `verify.ts`'s own binding check —
  is a pure function, exported specifically so it could be unit tested.
- **`lib/payments/paypal-webhook.ts` + `POST /api/v1/webhooks/:provider`**
  — raw body read before any JSON parse (§8), signature verification via
  PayPal's `verify-webhook-signature` endpoint, idempotent receipt logging
  on `webhook_events` (retry-of-same-event dedupe on `provider_event_id`),
  and — reusing `lib/payments/verify.ts`'s `captureAndApply` rather than
  duplicating the four checks — applies the `PAYMENT.CAPTURE.COMPLETED`
  effect through the exact same guarded path the mock flow already proved
  in Phase 3.
- **`lib/orders/cancel.ts`'s refund path now works unchanged for PayPal**
  — it already called the generic `provider.refund()`; Phase 4 only ever
  exercised it against the mock provider, but no code there is
  PayPal-specific.
- **`lib/notifications/email.ts`** (Resend) — `buildResendRequest` (pure)
  + `sendEmail`, wired into `lib/notifications/transport.ts`: sends for
  real when `RESEND_API_KEY`/`RESEND_FROM` are set, console-sinks
  otherwise (unchanged Phase-2-era behavior when unset, which is the
  actual current state). A failed send is recorded (`notifications.status
  = 'FAILED'`, `.error` set) rather than thrown — a notification failure
  must never fail the order it's attached to.
- **A real Vitest suite**, finally — deferred in Phases 2–4's notes,
  added now because this phase specifically needed a way to verify
  network-free logic for real. 19 tests: all three transition maps in
  `lib/orders/state.ts` (happy paths, illegal skips, terminal-state
  lockout, the cash-never-through-UNPAID path, multi-partial-refund),
  `parseCaptureResponse`'s six PayPal-response-shape cases, and
  `buildResendRequest`'s shape. `npm test` runs it.

## Tested

- **The full Vitest suite passes**: `npm test` → 19/19.
- **The webhook endpoint correctly REJECTS an unsigned/fabricated
  event** — sent a POST shaped like a real PayPal webhook body with a
  fake signature; got `400 signature verification failed`, and confirmed
  **no row was written to `webhook_events`** for it (the signature check
  runs before the receipt log, so a forged event leaves no trace pretending
  to be real). This is a genuinely meaningful, run test even without real
  PayPal credentials — it proves the endpoint doesn't trust unverified
  input, which is the security property that actually matters here.
- **Unknown webhook provider** (`/api/v1/webhooks/stripe`) correctly 404s.
- `npm run build` green (27 routes, including the new
  `/api/v1/webhooks/[provider]`). `tsc --noEmit` clean. `eslint` clean.
- **Not tested, and not testable from here**: OAuth token exchange, order
  creation, capture, refund, and webhook signature verification against a
  real PayPal endpoint; any Resend email actually arriving. §8's own
  go-live checklist already names the blocking item this maps to: "the
  webhook endpoint must be registered in the provider dashboard and
  verified with a real test event before launch."

## Known gaps

- **PayPal and Resend remain fully unverified live** — see above. When a
  real sandbox account and network access exist, the checklist is: (1) set
  `PAYPAL_CLIENT_ID`/`SECRET`/`ENVIRONMENT`/`WEBHOOK_ID`, (2) register the
  webhook URL in the PayPal developer dashboard, (3) send a real sandbox
  test event and confirm it's both received AND processed (not just a 200
  — check `webhook_events.processed_at`), (4) run a real sandbox order
  through quote → checkout → capture end to end, (5) do the same for
  Resend with a real send.
- **Capture timing is still checkout-time** (§27.2's open question) — an
  unaccepted order still becomes a full refund. The interface supports
  authorize-at-checkout/capture-at-assignment without a rewrite if that's
  decided later; not changed this phase since the decision itself is still
  explicitly open, not a code limitation.
- **The webhook handler processes synchronously in the request**, not in
  a genuine second pass after responding (§8 mentions this to avoid a slow
  handler hitting a platform timeout and triggering a retry storm). Given
  everything here is unverified anyway, added complexity for a
  background-processing pattern felt like the wrong thing to guess at
  blind; worth revisiting once this can actually be tested against real
  webhook latency.
- **Only `PAYMENT.CAPTURE.COMPLETED` has an automated effect.** Other
  event types (denials, PayPal-initiated refunds, disputes) are logged to
  `webhook_events` for ops visibility but don't yet drive
  `orders`/`refunds` automatically — reasonable v1 scope, not exhaustive
  PayPal event coverage.
- **Vitest covers pure logic only** — `lib/pricing/quote.ts`,
  `lib/pricing/serviceability.ts`, `lib/pricing/eta.ts` all hit the
  database directly and were verified by hand against the real local
  Supabase instance in Phases 2–3 (documented in those phases' notes), not
  by this suite. Extending Vitest to those would need either a test
  database fixture or a mocking layer over `serviceClient()` — a
  reasonable next investment, not done here.

## Next: Phase 6

Runner PWA — login, shift, offers, accept, status, delivery code, cash.
No external dependencies (§25's own roadmap notes "none" for this phase),
so unlike this one, everything in it should be fully verifiable end to end
against the real local database, the same way Phases 2–4 were.
