// Fails when the Build Your Coco JS outgrows its budget
// (docs/BUILD-YOUR-COCO-3D-PLAN.md §3). Run after `npm run build`.
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const KB = 1024;
const BUDGETS = {
  // Found by a string only that code contains.
  "3D chunk (lazy)": { marker: "uStickerSize", max: 30 * KB },
  "Builder chunk": { marker: "Share my coco", max: 15 * KB },
};

const dir = ".next/static/chunks";
const chunks = readdirSync(dir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => ({ file: f, src: readFileSync(join(dir, f), "utf8") }));
const html = readFileSync(".next/server/app/build-your-coco.html", "utf8");

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`✗ ${msg}`);
};

for (const [name, { marker, max }] of Object.entries(BUDGETS)) {
  const hits = chunks.filter((c) => c.src.includes(marker));
  if (hits.length !== 1) {
    fail(`${name}: expected 1 chunk containing "${marker}", found ${hits.length}`);
    continue;
  }
  const size = gzipSync(hits[0].src).length;
  const line = `${name}: ${(size / KB).toFixed(1)} KB gzip (budget ${max / KB} KB)`;
  if (size > max) fail(line);
  else console.log(`✓ ${line}`);
  if (name.startsWith("3D") && html.includes(hits[0].file)) {
    fail("3D chunk is referenced by the page's initial HTML; it must load lazily");
  }
}

process.exit(failed ? 1 : 0);
