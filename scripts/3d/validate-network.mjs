#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { collectManifestAssets } from "./validate-dish.mjs";
import { asArray, defaultDishManifestPath, parseArgs, readJsonFile, setExitCodeForResult, writeStdout } from "./shared/file-utils.mjs";
import { validateNetworkHeaders } from "./shared/validators/network-headers.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args["base-url"]) {
  console.error("Missing --base-url. Network validation is opt-in.");
  process.exit(1);
}

const manifestPaths = asArray(args.manifest ?? args["dish-manifest"] ?? defaultDishManifestPath());
const assets = manifestPaths.flatMap((manifestPath) => collectManifestAssets(readJsonFile(manifestPath)));
const routes = asArray(args.route);
const result = await validateNetworkHeaders({
  baseUrl: args["base-url"],
  routes,
  assets,
  strict: Boolean(args.strict)
});

if (args.out) {
  mkdirSync(dirname(String(args.out)), { recursive: true });
  writeFileSync(String(args.out), `${JSON.stringify(result, null, 2)}\n`);
}

setExitCodeForResult(result, Boolean(args.strict));
writeStdout(result, true);
