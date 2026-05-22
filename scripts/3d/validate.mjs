#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

import { validateDishManifest } from "./shared/manifest-schema.mjs";
import {
  detectFileKind,
  fileStatsForPublicUrl,
  ROOT_DIR,
  readJsonFile,
  writeJsonFile
} from "./shared/file-utils.mjs";
import { join } from "node:path";

function usage() {
  return [
    "Usage: node scripts/3d/validate.mjs --manifest <path> [--context production|demo|demo-fixture] [--out <path>]",
    "",
    "Default manifest is the safe non-public demo fixture."
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    manifest: "assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json",
    context: "demo-fixture",
    out: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      args.manifest = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--context") {
      args.context = argv[index + 1] ?? "";
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

function expectedKindForVariant(key) {
  if (key === "iosUsdz") return "usdz";
  if (key === "poster") return "image";
  return "glb";
}

function validateAssetFiles(manifest) {
  const checks = [];
  for (const [key, variant] of Object.entries(manifest.variants ?? {})) {
    try {
      const stats = fileStatsForPublicUrl(variant.url);
      if (!stats.exists) {
        checks.push({
          variant: key,
          status: "fail",
          message: `missing file ${stats.relativePath}`
        });
        continue;
      }

      const actualKind = detectFileKind(stats.filePath);
      const expectedKind = expectedKindForVariant(key);
      if (actualKind === "git-lfs-pointer") {
        checks.push({
          variant: key,
          status: "fail",
          message: `${stats.relativePath} is a Git LFS pointer`
        });
        continue;
      }
      if (actualKind !== expectedKind) {
        checks.push({
          variant: key,
          status: "fail",
          message: `${stats.relativePath} has kind ${actualKind}, expected ${expectedKind}`
        });
        continue;
      }
      if (stats.bytes !== variant.bytes) {
        checks.push({
          variant: key,
          status: "fail",
          message: `${stats.relativePath} bytes ${stats.bytes} do not match manifest ${variant.bytes}`
        });
        continue;
      }
      if (stats.sha256.toLowerCase() !== String(variant.sha256).toLowerCase()) {
        checks.push({
          variant: key,
          status: "fail",
          message: `${stats.relativePath} sha256 does not match manifest`
        });
        continue;
      }
      checks.push({
        variant: key,
        status: "ok",
        message: `${stats.relativePath} exists and matches manifest`
      });
    } catch (error) {
      checks.push({
        variant: key,
        status: "fail",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return checks;
}

function validateNextHeaders() {
  const checks = [];
  const source = readFileSync(join(ROOT_DIR, "next.config.ts"), "utf8");
  const expectations = [
    ["/models/restaurants/:path*.glb", "restaurant GLB header rule"],
    ["/models/restaurants/:path*.usdz", "restaurant USDZ header rule"],
    ["model/gltf-binary", "GLB Content-Type"],
    ["model/vnd.usdz+zip", "USDZ Content-Type"],
    ["Content-Disposition", "USDZ Content-Disposition"],
    ["inline", "USDZ inline disposition"],
    ["max-age=31536000", "immutable cache max-age"],
    ["immutable", "immutable cache directive"]
  ];

  for (const [needle, label] of expectations) {
    checks.push({
      check: label,
      status: source.includes(needle) ? "ok" : "fail",
      message: source.includes(needle)
        ? `${label} configured`
        : `${label} missing from next.config.ts`
    });
  }

  return checks;
}

const args = parseArgs(process.argv.slice(2));
if (!existsSync(args.manifest)) {
  throw new Error(`Manifest not found: ${args.manifest}`);
}

const manifest = readJsonFile(args.manifest);
const schema = validateDishManifest(manifest, { context: args.context });
const assetChecks = validateAssetFiles(manifest);
const headerChecks = validateNextHeaders();
const result = {
  generatedAt: new Date().toISOString(),
  manifest: args.manifest,
  context: args.context,
  valid:
    schema.valid &&
    assetChecks.every((check) => check.status !== "fail") &&
    headerChecks.every((check) => check.status !== "fail"),
  warnings: schema.warnings,
  fails: [
    ...schema.fails,
    ...assetChecks
      .filter((check) => check.status === "fail")
      .map((check) => `${check.variant}: ${check.message}`),
    ...headerChecks
      .filter((check) => check.status === "fail")
      .map((check) => `${check.check}: ${check.message}`)
  ],
  assetChecks,
  headerChecks
};

if (args.out) {
  writeJsonFile(args.out, result);
  console.log(`Wrote ${args.out}`);
}

for (const warning of result.warnings) console.warn(`WARN ${warning}`);
for (const fail of result.fails) console.error(`FAIL ${fail}`);

if (!result.valid) process.exit(1);
console.log("Production 3D manifest validation completed.");
