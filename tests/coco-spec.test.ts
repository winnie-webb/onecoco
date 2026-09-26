// Run with `npm test` (Node's built-in runner; Node strips the types).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanText,
  defaultSpec,
  isBlocked,
  normalizeSpec,
  priceLines,
  specFromParams,
  specToParams,
  stickerNames,
  validateSpec,
  type CocoSpec,
} from "../lib/coco/spec.ts";

const spec = (over: Partial<CocoSpec>): CocoSpec => ({ ...defaultSpec, ...over });
const total = (s: CocoSpec) => priceLines(s).reduce((n, l) => n + l.cents, 0);

test("a plain Classic is US$7", () => {
  assert.equal(total(defaultSpec), 700);
});

test("a named Classic is US$9, the marketing 'from' price", () => {
  assert.equal(total(spec({ name: "Sarah" })), 900);
});

test("the typical photo order is US$12", () => {
  assert.equal(total(spec({ name: "Sarah", extras: ["hibiscus", "umbrella"] })), 1200);
});

test("Coco for Two: a sticker per name, extras per coconut", () => {
  const s = spec({ product: "two", name: "Sarah", name2: "Tom", extras: ["hibiscus", "straw"] });
  assert.equal(total(s), 1200 + 2 * 200 + 2 * 200);
  assert.deepEqual(stickerNames(s), ["Sarah", "Tom"]);
});

test("a second name is never charged on Classic", () => {
  const s = spec({ name: "Sarah", name2: "Tom" });
  assert.equal(total(s), 900);
  assert.equal(specToParams(s).get("n2"), null);
});

test("URL round trip", () => {
  const s = spec({ product: "two", name: "José", name2: "Zoë", message: "Just married", design: "romance", font: "script", shape: "oval", straw: "pink", symbol: "heart", extras: ["lime", "hibiscus"] });
  assert.deepEqual(specFromParams(specToParams(s)), normalizeSpec(s));
});

test("junk in the URL falls back to defaults", () => {
  const s = specFromParams(new URLSearchParams("d=evil&f=comic&x=caviar,lime&p=ten"));
  assert.equal(s.design, "jamaican");
  assert.equal(s.font, "bold");
  assert.equal(s.product, "classic");
  assert.deepEqual(s.extras, ["lime"]);
});

test("emoji and unsupported characters are removed; accents kept", () => {
  assert.equal(cleanText("Jamaica 🌴 2026 ❤️", 40), "Jamaica 2026 ");
  assert.equal(cleanText("Siobhán & Zoë", 20), "Siobhán & Zoë");
  assert.equal(cleanText("a".repeat(30), 20).length, 20);
});

test("blocklist catches words, swaps and spacing, not innocent names", () => {
  assert.ok(isBlocked("b1tch"));
  assert.ok(isBlocked("Happy bumbo claat day"));
  assert.ok(isBlocked("b l o o d c l a a t"));
  for (const ok of ["Scunthorpe", "Sussex", "Dickens", "Cockburn", "Sebastian", "Jamaica 2026"]) {
    assert.equal(isBlocked(ok), false, ok);
  }
});

test("a message needs a name", () => {
  assert.equal(validateSpec(spec({ message: "Hi" }))[0]?.field, "name");
  assert.deepEqual(validateSpec(spec({ name: "Sarah", message: "Hi" })), []);
});

test("second name is only validated on Coco for Two", () => {
  assert.deepEqual(validateSpec(spec({ name: "Sarah", name2: "shit" })), []);
  assert.equal(validateSpec(spec({ product: "two", name: "Sarah", name2: "shit" }))[0]?.field, "name2");
});
