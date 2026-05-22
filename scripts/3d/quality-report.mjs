#!/usr/bin/env node
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateDishManifestFile } from "./validate-dish.mjs";
import { writeValidationReports } from "./shared/validators/report-writer.mjs";

const DEFAULT_MANIFEST =
  "assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json";

function usage() {
  return [
    "Usage: node scripts/3d/quality-report.mjs [--manifest <path>] [--context production|demo|demo-fixture]",
    "       [--out-dir <folder>] [--json-out <path>] [--md-out <path>]"
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST,
    context: "demo-fixture",
    outDir: "",
    jsonOut: "",
    mdOut: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      args.manifest = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--context") {
      args.context = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--out-dir") {
      args.outDir = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--json-out") {
      args.jsonOut = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--md-out") {
      args.mdOut = argv[index + 1] ?? "";
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

function defaultOutDir(manifest) {
  return join(
    "test-results",
    "3d",
    manifest.restaurantSlug,
    manifest.menuSlug,
    manifest.dishSlug,
    manifest.activeVersion
  );
}

function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const { manifest, result } = validateDishManifestFile(args.manifest, {
    context: args.context
  });
  const outDir = args.outDir || (manifest ? defaultOutDir(manifest) : join("test-results", "3d"));
  const jsonOut = args.jsonOut || join(outDir, "quality-report.json");
  const mdOut = args.mdOut || join(outDir, "quality-report.md");

  writeValidationReports({
    jsonOut,
    mdOut,
    title: "Vistaire 3D/AR Quality Report",
    result,
    manifest
  });

  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);
  for (const warning of result.warnings) console.warn(`WARNING ${warning}`);
  for (const fail of result.fails) console.error(`FAIL ${fail}`);
  if (!result.ok) process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
