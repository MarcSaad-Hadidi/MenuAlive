#!/usr/bin/env node
import { parseArgs, readJsonFile, setExitCodeForResult, writeStdout } from "./shared/file-utils.mjs";
import { validateRestaurantManifest } from "./shared/manifest-schema.mjs";

const args = parseArgs(process.argv.slice(2));
const manifestPath = args.manifest ?? args["restaurant-manifest"];
if (!manifestPath) {
  console.error("Missing --manifest or --restaurant-manifest");
  process.exit(1);
}

const result = validateRestaurantManifest(readJsonFile(manifestPath));
setExitCodeForResult(result, Boolean(args.strict));
writeStdout(result, true);
