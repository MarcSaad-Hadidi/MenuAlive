#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readJsonFile } from "./shared/file-utils.mjs";
import { addFail, createValidationResult } from "./shared/validators/file-exists.mjs";
import { validateNetworkHeaders } from "./shared/validators/network-headers.mjs";
import { writeValidationReports } from "./shared/validators/report-writer.mjs";

function usage() {
  return [
    "Usage: node scripts/3d/validate-network.mjs --base-url <url> --manifest <dish-manifest>",
    "       node scripts/3d/validate-network.mjs --base-url <url> --restaurant-manifest <restaurant-manifest>",
    "       [--route <path>] [--json-out <path>] [--md-out <path>]"
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.VALIDATE_NETWORK_BASE_URL ?? process.env.VALIDATE_DEMO_BASE_URL ?? "",
    manifest: "",
    restaurantManifest: "",
    routes: [],
    jsonOut: "",
    mdOut: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      args.baseUrl = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--manifest") {
      args.manifest = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--restaurant-manifest") {
      args.restaurantManifest = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--route") {
      args.routes.push(argv[index + 1] ?? "");
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

  if (!args.baseUrl) throw new Error(`Missing --base-url\n\n${usage()}`);
  if (!args.manifest && !args.restaurantManifest) {
    throw new Error(`Missing --manifest or --restaurant-manifest\n\n${usage()}`);
  }
  return args;
}

function assetEntriesFromDishManifest(manifest) {
  return Object.entries(manifest.variants ?? {}).map(([role, variant]) => ({
    url: variant.url,
    role,
    label: `${manifest.dishSlug} ${role} ${variant.url}`,
    productionQuickLook: role === "iosUsdz"
  }));
}

function loadDishManifestsFromRestaurantManifest(restaurantManifestPath) {
  const restaurantManifest = readJsonFile(restaurantManifestPath);
  const root = dirname(restaurantManifestPath);
  const manifests = [];
  for (const dish of restaurantManifest.dishes ?? []) {
    const manifestPath = join(root, dish.menuSlug, dish.dishSlug, "manifest.json");
    if (existsSync(manifestPath)) manifests.push(readJsonFile(manifestPath));
  }
  return {
    restaurantManifest,
    manifests
  };
}

function collectAssets(args) {
  if (args.manifest) {
    const manifest = readJsonFile(args.manifest);
    return {
      manifest,
      assets: assetEntriesFromDishManifest(manifest)
    };
  }

  const { restaurantManifest, manifests } = loadDishManifestsFromRestaurantManifest(
    args.restaurantManifest
  );
  return {
    manifest: restaurantManifest,
    assets: manifests.flatMap(assetEntriesFromDishManifest)
  };
}

async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const result = createValidationResult({
    name: "network-validation",
    checks: []
  });
  let manifest = null;

  try {
    const collected = collectAssets(args);
    manifest = collected.manifest;
    const network = await validateNetworkHeaders({
      baseUrl: args.baseUrl,
      routes: args.routes.filter(Boolean),
      assets: collected.assets
    });
    result.checks.push(network);
    result.warnings.push(...network.warnings);
    result.fails.push(...network.fails);
    result.evidence.push(...network.evidence);
    result.metrics = network.metrics;
    if (!network.ok) result.ok = false;
  } catch (error) {
    addFail(result, error instanceof Error ? error.message : String(error));
  }

  writeValidationReports({
    jsonOut: args.jsonOut,
    mdOut: args.mdOut,
    title: "Vistaire 3D Network Validation",
    result,
    manifest
  });

  for (const warning of result.warnings) console.warn(`WARNING ${warning}`);
  for (const fail of result.fails) console.error(`FAIL ${fail}`);
  if (!result.ok) process.exitCode = 1;
  else console.log("3D network validation completed.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  });
}
