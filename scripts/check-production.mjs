#!/usr/bin/env node
/**
 * Go-live check (launch-readiness Gate A "Technology" + Gate B payment
 * items). Run against the PRODUCTION environment's variables:
 *
 *   npx vercel env pull .env.production.local --environment=production
 *   node --env-file=.env.production.local scripts/check-production.mjs [--expect-paypal=live|sandbox]
 *
 * Checks the settings that fail SILENTLY when wrong (ARCHITECTURE §23),
 * then probes the live database with the PUBLIC anon key to prove RLS hides
 * every private table, then hits the deployed site's health endpoint.
 * Exits non-zero if anything fails. Prints no secret values.
 */
import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const expectPaypal = args["expect-paypal"] ?? "live";
const env = process.env;

let failures = 0;
let warnings = 0;
const pass = (msg) => console.log(`  PASS  ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const warn = (msg) => {
  warnings++;
  console.log(`  WARN  ${msg}`);
};
const need = (name, why) => (env[name] ? pass(`${name} is set`) : fail(`${name} is not set — ${why}`));

console.log("\nConfiguration");
const site = env.NEXT_PUBLIC_SITE_URL ?? "";
if (!site) fail("NEXT_PUBLIC_SITE_URL is not set — PayPal return URLs would point at localhost");
else if (!site.startsWith("https://") || /localhost|127\.0\.0\.1|vercel\.app/.test(site))
  fail(`NEXT_PUBLIC_SITE_URL is ${site} — must be the real https domain customers use`);
else pass(`NEXT_PUBLIC_SITE_URL = ${site}`);

need("NEXT_PUBLIC_SUPABASE_URL", "app cannot reach the database");
need("NEXT_PUBLIC_SUPABASE_ANON_KEY", "browser/runner auth cannot work");
need("SUPABASE_SERVICE_ROLE_KEY", "server cannot read or write orders");
need("CRON_SECRET", "the sweep (expiry refunds, location retention) will never run");

if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
  pass("PayPal credentials are set (card checkout enabled)");
  if ((env.PAYPAL_ENVIRONMENT ?? "sandbox") !== expectPaypal)
    fail(`PAYPAL_ENVIRONMENT is "${env.PAYPAL_ENVIRONMENT ?? "(unset → sandbox)"}", expected "${expectPaypal}"`);
  else pass(`PAYPAL_ENVIRONMENT = ${expectPaypal}`);
  need("PAYPAL_WEBHOOK_ID", "webhook signatures cannot be verified, so every webhook is rejected");
} else {
  warn("PayPal is not configured — production offers CASH ONLY (fine for Pilot-0, blocks Gate B)");
}

if (env.RESEND_API_KEY && env.RESEND_FROM) pass("Resend is configured");
else warn("Resend not configured — confirmation/refund emails go to the console only");

const email = env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
if (!email || email.endsWith("@example.com")) fail("NEXT_PUBLIC_CONTACT_EMAIL is unset or a placeholder");
else pass(`contact email = ${email}`);
if (!/^\d{10,15}$/.test(env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? ""))
  fail("NEXT_PUBLIC_CONTACT_WHATSAPP must be international digits only, e.g. 18765550123");
else pass("WhatsApp number set");

if (env.ALERT_WEBHOOK_URL) pass("ALERT_WEBHOOK_URL is set (server errors and failed refunds alert)");
else fail("ALERT_WEBHOOK_URL is not set — failed refunds and server errors would go unnoticed");

if (env.ORDER_ALERT_WEBHOOK_URL || (env.ORDER_ALERT_EMAILS && env.RESEND_API_KEY && env.RESEND_FROM))
  pass("New-order alerts are configured (ORDER_ALERT_WEBHOOK_URL / ORDER_ALERT_EMAILS)");
else fail("No new-order alerts: set ORDER_ALERT_WEBHOOK_URL, or ORDER_ALERT_EMAILS with Resend — otherwise nobody is told about orders");

if (!env.NEXT_PUBLIC_POSTHOG_KEY) warn("NEXT_PUBLIC_POSTHOG_KEY not set — funnel analytics are a no-op");

const legal = fs.readFileSync(new URL("../lib/legal.ts", import.meta.url), "utf8");
if (/reviewed:\s*true/.test(legal)) pass("lib/legal.ts marks policies as reviewed");
else fail("lib/legal.ts: policies not marked reviewed by counsel — draft notice still showing");

console.log("\nRow-level security (anon key against production)");
const PRIVATE_TABLES = [
  "orders", "customers", "payments", "refunds", "order_locations", "order_items",
  "order_item_customizations", "order_events", "order_assignments", "order_offers",
  "quotes", "runners", "runner_locations", "shifts", "shift_cash", "app_users",
  "partner_users", "partners", "notifications", "webhook_events", "audit_log",
  "zone_demand_requests", "reviews", "rate_limit_hits",
];
async function count(table, key) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  if (!res.ok) return { denied: true };
  const range = res.headers.get("content-range") ?? "*/0";
  return { rows: Number(range.split("/")[1] ?? 0) || (await res.json()).length };
}
if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY) {
  for (const table of PRIVATE_TABLES) {
    try {
      const anon = await count(table, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (anon.rows > 0) {
        fail(`${table}: anon can read ${anon.rows} row(s) — RLS is leaking`);
        continue;
      }
      const service = await count(table, env.SUPABASE_SERVICE_ROLE_KEY);
      if (service.denied) warn(`${table}: service role could not read it — table missing? (migrations applied?)`);
      else if (service.rows === 0) warn(`${table}: anon sees nothing, but the table is empty — re-run after the dry-run orders`);
      else pass(`${table}: anon sees 0 of ${service.rows} row(s)`);
    } catch (err) {
      fail(`${table}: probe failed (${err.message})`);
    }
  }
} else {
  fail("skipped — Supabase variables missing");
}

console.log("\nDeployed site");
if (site.startsWith("https://")) {
  try {
    const res = await fetch(`${site}/api/v1/health`);
    if (res.ok) pass(`${site}/api/v1/health → 200 (app can reach the database)`);
    else fail(`${site}/api/v1/health → ${res.status}`);
  } catch (err) {
    fail(`could not reach ${site} (${err.message})`);
  }
} else {
  fail("skipped — no https site URL");
}

console.log(`\n${failures} failed, ${warnings} warning(s).`);
console.log(
  "Not checkable from here — do by hand: PayPal webhook registered + real test event processed " +
    "(webhook_events.processed_at set), US$1 live capture + refund, zone pin test (scripts/zone-pin-test.mjs), backup restore.\n",
);
process.exit(failures > 0 ? 1 : 0);
