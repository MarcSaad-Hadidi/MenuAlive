#!/usr/bin/env node
import { readdirSync } from "node:fs";
import { join } from "node:path";

import {
  summarizeRestaurantManifest,
  validateDishManifest
} from "./shared/manifest-schema.mjs";
import { readJsonFile, writeJsonFile } from "./shared/file-utils.mjs";

function usage() {
  return [
    "Usage: node scripts/3d/manifest.mjs --dish-manifest <path> [--out <path>]",
    "       node scripts/3d/manifest.mjs --restaurant <slug> --root <folder> [--out <path>]",
    "",
    "Default command summarizes the safe Maison Elyse fixture."
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    dishManifest: "assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json",
    restaurant: "",
    root: "",
    out: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dish-manifest") {
      args.dishManifest = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--restaurant") {
      args.restaurant = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--root") {
      args.root = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--out") {
      args.out = argv[index + 1] ?? "";
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

function walkJsonFiles(folder) {
  const entries = readdirSync(folder, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(folder, entry.name);
    if (entry.isDirectory()) return walkJsonFiles(fullPath);
    return entry.isFile() && entry.name === "manifest.json" ? [fullPath] : [];
  });
}

const args = parseArgs(process.argv.slice(2));
const dishManifests =
  args.restaurant && args.root
    ? walkJsonFiles(args.root)
        .map(readJsonFile)
        .filter((manifest) => manifest?.variants && manifest?.dishSlug)
    : [readJsonFile(args.dishManifest)];
const restaurantSlug = args.restaurant || dishManifests[0]?.restaurantSlug;

if (!restaurantSlug) throw new Error("Unable to resolve restaurant slug.");

for (const manifest of dishManifests) {
  const validation = validateDishManifest(manifest, {
    context: manifest.variants?.web?.url?.startsWith("/models/demo/")
      ? "demo-fixture"
      : "production"
  });
  if (!validation.valid) {
    throw new Error(
      `Cannot summarize invalid dish manifest ${manifest.dishSlug}: ${validation.fails.join("; ")}`
    );
  }
}

const summary = summarizeRestaurantManifest(restaurantSlug, dishManifests);

if (args.out) {
  writeJsonFile(args.out, summary);
  console.log(`Wrote ${args.out}`);
} else {
  console.log(JSON.stringify(summary, null, 2));
}
