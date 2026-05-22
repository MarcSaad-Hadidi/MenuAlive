#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

import { classifyBudget, PRODUCTION_3D_BUDGETS, variantBudgetKey } from "./shared/budgets.mjs";
import {
  detectFileKind,
  fileStatsForPublicUrl,
  readJsonFile,
  writeJsonFile
} from "./shared/file-utils.mjs";

function usage() {
  return [
    "Usage: node scripts/3d/analyze.mjs --manifest <path> [--out <path>]",
    "",
    "The command is read-only unless --out is provided."
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    manifest: "assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json",
    out: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      args.manifest = argv[index + 1] ?? "";
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

  if (!args.manifest) throw new Error(`Missing --manifest\n\n${usage()}`);
  return args;
}

function inspectGlbJson(filePath) {
  if (!existsSync(filePath)) return null;
  const bytes = readFileSync(filePath);
  if (bytes.subarray(0, 4).toString("utf8") !== "glTF") return null;
  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) return null;
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
  const primitives = (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
  const accessors = json.accessors ?? [];
  let triangleCount = 0;
  for (const primitive of primitives) {
    if (primitive.indices != null) {
      triangleCount += Math.floor((accessors[primitive.indices]?.count ?? 0) / 3);
    }
  }
  return {
    meshCount: json.meshes?.length ?? 0,
    primitiveCount: primitives.length,
    triangleCount,
    materialCount: json.materials?.length ?? 0,
    textureCount: json.textures?.length ?? 0,
    imageCount: json.images?.length ?? 0,
    requiredExtensions: json.extensionsRequired ?? []
  };
}

function analyzeManifest(manifest) {
  const variants = {};
  for (const [key, variant] of Object.entries(manifest.variants ?? {})) {
    const stats = fileStatsForPublicUrl(variant.url);
    const kind = stats.exists ? detectFileKind(stats.filePath) : "missing";
    const budgetKey = variantBudgetKey(key);
    const budget = PRODUCTION_3D_BUDGETS.variants[budgetKey]?.bytes;
    variants[key] = {
      url: variant.url,
      exists: stats.exists,
      file: stats.relativePath,
      bytes: stats.bytes,
      sha256: stats.sha256,
      manifestBytes: variant.bytes,
      manifestSha256: variant.sha256,
      kind,
      budgetStatus: budget ? classifyBudget(stats.bytes || variant.bytes, budget) : "unknown",
      glb: kind === "glb" ? inspectGlbJson(stats.filePath) : null
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    manifestIdentity: {
      restaurantSlug: manifest.restaurantSlug,
      menuSlug: manifest.menuSlug,
      dishSlug: manifest.dishSlug,
      activeVersion: manifest.activeVersion,
      status: manifest.status
    },
    variants,
    sourceExposure: Object.values(manifest.variants ?? {}).filter((variant) =>
      String(variant.url).startsWith("/assets/3d/source/")
    ),
    workExposure: Object.values(manifest.variants ?? {}).filter((variant) =>
      String(variant.url).startsWith("/assets/3d/work/")
    )
  };
}

const args = parseArgs(process.argv.slice(2));
const manifest = readJsonFile(args.manifest);
const analysis = analyzeManifest(manifest);

if (args.out) {
  writeJsonFile(args.out, analysis);
  console.log(`Wrote ${args.out}`);
} else {
  console.log(JSON.stringify(analysis, null, 2));
}
