// Dev-only script: prints pdf-parse text extraction of a fixture PDF so we can
// build regex/section parsers against the real text-layer ordering.
//
// Usage:  bun run packages/revolut-pdf/scripts/extract-text.ts <fixture-path>
import { readFileSync } from "node:fs";
// @ts-expect-error - pdf-parse has no types for the internal entry; @types/pdf-parse covers the public one
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const file = process.argv[2];
if (!file) {
  console.error("Pass a PDF path");
  process.exit(1);
}

const buf = readFileSync(file);
const out = await pdfParse(buf);
console.log("=== META ===");
console.log({ numpages: out.numpages, info: out.info?.Title });
console.log("=== TEXT ===");
console.log(out.text);
