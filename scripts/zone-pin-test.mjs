#!/usr/bin/env node
/**
 * Launch-readiness Gate A / audit T-6: after the real zone polygon is
 * surveyed and loaded, prove it resolves the way the walk said it should.
 *
 *   node scripts/zone-pin-test.mjs https://<site> scripts/zone-pins.example.json
 *
 * The pins file is a list of { "name", "lat", "lng", "expect" } where expect
 * is "covered" (inside the zone), "borderline" (just outside, within the
 * buffer) or "none" (clearly outside — e.g. on the neighbouring hotel's
 * private beach). Record at least 6 points on the walk: 2 of each.
 * Serviceability (open hours, runners, stock) is NOT tested — only geometry.
 */
import fs from "node:fs";

const [site, file] = process.argv.slice(2);
if (!site || !file) {
  console.error("usage: node scripts/zone-pin-test.mjs <site-url> <pins.json>");
  process.exit(2);
}
const pins = JSON.parse(fs.readFileSync(file, "utf8"));
let failures = 0;
for (const pin of pins) {
  const res = await fetch(`${site.replace(/\/$/, "")}/api/v1/zones/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: pin.lat, lng: pin.lng, accuracyM: 10 }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.match === pin.expect;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${pin.name}: expected ${pin.expect}, got ${data.match ?? `HTTP ${res.status}`}${data.zone?.name ? ` (${data.zone.name})` : ""}`);
}
console.log(`\n${pins.length - failures}/${pins.length} pins resolved as expected.`);
process.exit(failures > 0 ? 1 : 0);
