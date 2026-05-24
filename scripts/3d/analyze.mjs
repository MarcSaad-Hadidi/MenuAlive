#!/usr/bin/env node
import {
  defaultDishManifestPath,
  parseArgs,
  readJsonFile,
  writeStdout
} from "./shared/file-utils.mjs";
import { validateDishManifest } from "./shared/manifest-schema.mjs";

const args = parseArgs(process.argv.slice(2));
const manifestPath = args.manifest ?? defaultDishManifestPath();
const manifest = readJsonFile(manifestPath);
const result = validateDishManifest(manifest, { context: args.context ?? "production" });

writeStdout(
  {
    manifestPath,
    identity: {
      restaurantSlug: manifest.restaurantSlug,
      menuSlug: manifest.menuSlug,
      dishSlug: manifest.dishSlug,
      activeVersion: manifest.activeVersion,
      status: manifest.status,
      validationStatus: manifest.validationStatus
    },
    metrics: result.metrics,
    warnings: result.warnings,
    fails: result.fails
  },
  true
);
process.exitCode = result.ok ? 0 : 1;
