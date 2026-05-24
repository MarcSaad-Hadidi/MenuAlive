#!/usr/bin/env node
import { writeFileSync } from "node:fs";

import { asArray, defaultDishManifestPath, parseArgs, readJsonFile, writeStdout } from "./shared/file-utils.mjs";
import { summarizeRestaurantManifest } from "./shared/manifest-schema.mjs";

const args = parseArgs(process.argv.slice(2));
const manifestPaths = asArray(args["dish-manifest"] ?? args.manifest ?? defaultDishManifestPath());
const dishManifests = manifestPaths.map((manifestPath) => readJsonFile(manifestPath));
const restaurantSlug = args["restaurant-slug"] ?? dishManifests[0]?.restaurantSlug;

if (!restaurantSlug) {
  console.error("Missing restaurant slug");
  process.exit(1);
}

const summary = summarizeRestaurantManifest(restaurantSlug, dishManifests);
const output = JSON.stringify(summary, null, 2);
if (args.out) {
  writeFileSync(args.out, `${output}\n`);
} else {
  writeStdout(output);
}
