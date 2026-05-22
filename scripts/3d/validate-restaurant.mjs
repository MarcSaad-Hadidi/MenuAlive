#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { summarizeRestaurantManifest } from "./shared/manifest-schema.mjs";
import { readJsonFile } from "./shared/file-utils.mjs";
import { addFail, createValidationResult } from "./shared/validators/file-exists.mjs";
import { writeValidationReports } from "./shared/validators/report-writer.mjs";
import { validateDishManifestFile } from "./validate-dish.mjs";

function usage() {
  return [
    "Usage: node scripts/3d/validate-restaurant.mjs --restaurant <slug> --root <folder>",
    "       [--restaurant-manifest <path>] [--context production] [--json-out <path>] [--md-out <path>]"
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    restaurant: "",
    root: "",
    restaurantManifest: "",
    context: "production",
    jsonOut: "",
    mdOut: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--restaurant") {
      args.restaurant = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--root") {
      args.root = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--restaurant-manifest") {
      args.restaurantManifest = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--context") {
      args.context = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--json-out" || arg === "--out") {
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

  if (args.restaurantManifest && !args.root) args.root = dirname(args.restaurantManifest);
  if (!args.root) throw new Error(`Missing --root or --restaurant-manifest\n\n${usage()}`);
  return args;
}

function walkManifestFiles(folder) {
  const entries = readdirSync(folder, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(folder, entry.name);
    if (entry.isDirectory()) return walkManifestFiles(fullPath);
    return entry.isFile() && entry.name === "manifest.json" ? [fullPath] : [];
  });
}

function isDishManifest(filePath) {
  try {
    const manifest = readJsonFile(filePath);
    return Boolean(manifest?.variants && manifest.restaurantSlug && manifest.dishSlug);
  } catch {
    return false;
  }
}

function addChildResult(parent, child) {
  parent.checks.push(child);
  parent.warnings.push(...child.warnings);
  parent.fails.push(...child.fails);
  parent.evidence.push(...child.evidence);
  if (!child.ok) parent.ok = false;
}

export function validateRestaurant({ restaurant, root, restaurantManifest, context = "production" }) {
  const result = createValidationResult({
    name: "restaurant-validation",
    metrics: {
      restaurant,
      root,
      manifestCount: 0,
      dishManifests: []
    },
    checks: []
  });

  if (!existsSync(root)) {
    return {
      manifest: null,
      result: addFail(result, `Restaurant root not found: ${root}`)
    };
  }

  const dishManifestPaths = walkManifestFiles(root).filter(isDishManifest);
  result.metrics.manifestCount = dishManifestPaths.length;
  if (dishManifestPaths.length === 0) {
    addFail(result, `No dish manifest.json files found under ${root}`);
  }

  const dishManifests = [];
  for (const manifestPath of dishManifestPaths) {
    const validation = validateDishManifestFile(manifestPath, { context });
    if (validation.manifest) dishManifests.push(validation.manifest);
    result.metrics.dishManifests.push(manifestPath);
    addChildResult(result, validation.result);
  }

  const restaurantSlug =
    restaurant ||
    dishManifests[0]?.restaurantSlug ||
    (restaurantManifest ? readJsonFile(restaurantManifest).restaurantSlug : "");
  let summary = null;
  if (dishManifests.length > 0 && restaurantSlug) {
    summary = summarizeRestaurantManifest(restaurantSlug, dishManifests);
    result.metrics.summary = summary;
  }

  if (restaurantManifest && existsSync(restaurantManifest) && summary) {
    const current = readJsonFile(restaurantManifest);
    if (JSON.stringify(current.activeVersions ?? {}) !== JSON.stringify(summary.activeVersions ?? {})) {
      addFail(result, `${restaurantManifest}: activeVersions do not match dish manifests`);
    }
  }

  return {
    manifest: summary,
    result
  };
}

function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const { manifest, result } = validateRestaurant(args);
  writeValidationReports({
    jsonOut: args.jsonOut,
    mdOut: args.mdOut,
    title: "Vistaire 3D Restaurant Validation",
    result,
    manifest
  });

  for (const warning of result.warnings) console.warn(`WARNING ${warning}`);
  for (const fail of result.fails) console.error(`FAIL ${fail}`);
  if (!result.ok) process.exitCode = 1;
  else console.log("3D restaurant validation completed.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
