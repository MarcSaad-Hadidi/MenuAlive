#!/usr/bin/env node
import { buildValidationReportMarkdown } from "./shared/report-utils.mjs";
import { validateDishManifest } from "./shared/manifest-schema.mjs";
import { readJsonFile } from "./shared/file-utils.mjs";

function usage() {
  return [
    "Usage: node scripts/3d/report.mjs --manifest <path> [--context production|demo|demo-fixture]",
    "",
    "Writes Markdown to stdout. Redirect or pass --out in a future CI wrapper if you want artifacts."
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    manifest: "assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json",
    context: "demo-fixture"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      args.manifest = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--context") {
      args.context = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const manifest = readJsonFile(args.manifest);
const validation = validateDishManifest(manifest, { context: args.context });
const markdown = buildValidationReportMarkdown({
  title: "Vistaire Production 3D/AR Asset Report",
  manifest,
  validation
});

console.log(markdown);
if (!validation.valid) process.exit(1);
