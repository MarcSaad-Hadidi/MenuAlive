#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  fileStatsForPublicUrl,
  publicUrlToFilePath,
  readJsonFile,
  workspaceRelative
} from "./shared/file-utils.mjs";
import { addFail, createValidationResult } from "./shared/validators/file-exists.mjs";
import { validateGlbBasic } from "./shared/validators/glb-basic.mjs";
import { validateDishManifestSchema } from "./shared/validators/manifest-schema.mjs";
import { writeValidationReports } from "./shared/validators/report-writer.mjs";
import { validateSha256 } from "./shared/validators/sha256.mjs";
import { validateUsdzBasic } from "./shared/validators/usdz-basic.mjs";

const DEFAULT_MANIFEST =
  "assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json";

function usage() {
  return [
    "Usage: node scripts/3d/validate-dish.mjs --manifest <path> [--context production|demo|demo-fixture]",
    "       [--json-out <path>] [--md-out <path>] [--strict-warnings]",
    "",
    "Default manifest is the safe Maison Elyse demo fixture."
  ].join("\n");
}

export function parseValidateDishArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST,
    context: "demo-fixture",
    jsonOut: "",
    mdOut: "",
    strictWarnings: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      args.manifest = argv[index + 1] ?? "";
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
    } else if (arg === "--strict-warnings") {
      args.strictWarnings = true;
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

function addChildResult(parent, child) {
  parent.checks ??= [];
  parent.checks.push(child);
  parent.warnings.push(...child.warnings);
  parent.fails.push(...child.fails);
  parent.evidence.push(...child.evidence);
  if (!child.ok) parent.ok = false;
}

function expectedKindForVariant(key) {
  if (key === "iosUsdz") return "usdz";
  if (key === "poster") return "poster";
  return "glb";
}

function validatePoster({ filePath, variant, key }) {
  const result = createValidationResult({
    name: "poster-basic",
    metrics: { filePath, variant: key }
  });
  if (!existsSync(filePath)) {
    return addFail(result, `${key}: poster file not found ${workspaceRelative(filePath)}`);
  }
  const bytes = statSync(filePath).size;
  result.metrics.bytes = bytes;
  if (bytes <= 0) addFail(result, `${key}: poster file is empty`);
  const sha = validateSha256({
    filePath,
    expectedSha256: variant.sha256,
    label: key
  });
  addChildResult(result, sha);
  return result;
}

function validateVariantFile(manifest, key, variant) {
  const result = createValidationResult({
    name: `variant-${key}`,
    metrics: {
      key,
      url: variant?.url ?? "",
      filePath: "",
      bytes: 0
    }
  });

  try {
    const filePath = publicUrlToFilePath(variant.url);
    result.metrics.filePath = filePath;
    const stats = fileStatsForPublicUrl(variant.url);
    result.metrics.bytes = stats.bytes;
    result.evidence.push({
      key,
      url: variant.url,
      file: stats.relativePath,
      exists: stats.exists,
      bytes: stats.bytes
    });

    if (!stats.exists) {
      addFail(result, `${key}: missing file ${stats.relativePath}`);
      return result;
    }
    if (stats.bytes !== variant.bytes) {
      addFail(result, `${key}: file bytes ${stats.bytes} do not match manifest ${variant.bytes}`);
    }

    const expectedKind = expectedKindForVariant(key);
    if (expectedKind === "glb") {
      addChildResult(result, validateGlbBasic({ filePath, role: key, label: key }));
    } else if (expectedKind === "usdz") {
      addChildResult(
        result,
        validateUsdzBasic({
          filePath,
          url: variant.url,
          productionUrl: key === "iosUsdz",
          label: key
        })
      );
    } else {
      addChildResult(result, validatePoster({ filePath, variant, key }));
    }

    if (variant.sha256) {
      addChildResult(
        result,
        validateSha256({
          filePath,
          expectedSha256: variant.sha256,
          label: key
        })
      );
    }
  } catch (error) {
    addFail(result, `${key}: ${error instanceof Error ? error.message : String(error)}`);
  }

  result.metrics.restaurantSlug = manifest.restaurantSlug;
  result.metrics.dishSlug = manifest.dishSlug;
  return result;
}

export function validateDishManifestObject(manifest, options = {}) {
  const context = options.context ?? "production";
  const result = createValidationResult({
    name: "dish-validation",
    metrics: {
      context,
      manifestPath: options.manifestPath ?? "",
      assets: []
    },
    checks: []
  });

  addChildResult(result, validateDishManifestSchema(manifest, { context }));

  for (const [key, variant] of Object.entries(manifest.variants ?? {})) {
    const variantResult = validateVariantFile(manifest, key, variant);
    result.metrics.assets.push(variantResult.metrics);
    addChildResult(result, variantResult);
  }

  return result;
}

export function validateDishManifestFile(manifestPath, options = {}) {
  if (!existsSync(manifestPath)) {
    const result = createValidationResult({
      name: "dish-validation",
      metrics: { manifestPath },
      checks: []
    });
    return {
      manifest: null,
      result: addFail(result, `Manifest not found: ${manifestPath}`)
    };
  }

  const manifest = readJsonFile(manifestPath);
  return {
    manifest,
    result: validateDishManifestObject(manifest, {
      ...options,
      manifestPath
    })
  };
}

export function runValidateDishCli(argv = process.argv.slice(2)) {
  const args = parseValidateDishArgs(argv);
  const { manifest, result } = validateDishManifestFile(args.manifest, {
    context: args.context
  });

  writeValidationReports({
    jsonOut: args.jsonOut,
    mdOut: args.mdOut,
    title: "Vistaire 3D Dish Validation",
    result,
    manifest
  });

  for (const warning of result.warnings) console.warn(`WARNING ${warning}`);
  for (const fail of result.fails) console.error(`FAIL ${fail}`);

  if (!result.ok || (args.strictWarnings && result.warnings.length > 0)) {
    process.exitCode = 1;
  } else {
    console.log("3D dish validation completed.");
  }
  return result;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    runValidateDishCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
