/**
 * Audit T-5. The policy pages under app/(marketing)/{terms,privacy,refunds}
 * are working drafts written from what the code actually does (retention,
 * processors, refund rules). They are NOT legal advice and have not been
 * reviewed by a Jamaican attorney.
 *
 * While `reviewed` is false every policy page shows a visible draft notice
 * and `scripts/check-production.mjs` fails. Flip it, and set the date, only
 * once counsel has signed off on the text (go-to-market doc 04, F-5).
 */
export const legal = {
  reviewed: false,
  lastUpdated: "2026-10-21",
  /** Registered company name, once incorporated (doc 04, A-1). */
  operator: process.env.NEXT_PUBLIC_LEGAL_ENTITY || "the operator of this site",
} as const;
