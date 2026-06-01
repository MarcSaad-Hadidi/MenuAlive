#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseArgs, writeStdout } from "./shared/file-utils.mjs";

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

function required(value, label) {
  const stringValue = String(value ?? "").trim();
  if (!stringValue) throw new Error(`${label} is required`);
  return stringValue;
}

function safeSegment(value, label) {
  const segment = required(value, label);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(segment) || segment.includes("..")) {
    throw new Error(`${label} must be a safe path segment`);
  }
  return segment.toLowerCase();
}

function runNode(script, args, rootDir) {
  const stdout = execFileSync(process.execPath, [script, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true
  });
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  return start >= 0 && end > start ? JSON.parse(stdout.slice(start, end + 1)) : { ok: true, stdout };
}

export function buildHeavyOptimizePlan(args) {
  const rootDir = normalize(resolve(String(args.root ?? process.cwd())));
  const identity = {
    restaurantSlug: safeSegment(args.restaurant ?? args["restaurant-slug"], "restaurant"),
    menuSlug: safeSegment(args.menu ?? args["menu-slug"], "menu"),
    dishSlug: safeSegment(args.dish ?? args["dish-slug"], "dish"),
    version: safeSegment(args.version, "version")
  };
  const source = normalize(resolve(required(args.source, "--source")));
  const reports = join(rootDir, "assets", "3d", "reports", identity.restaurantSlug, identity.menuSlug, identity.dishSlug, identity.version);
  const repairedSource = join(rootDir, "assets", "3d", "work", identity.restaurantSlug, identity.menuSlug, identity.dishSlug, identity.version, "repaired", `${identity.dishSlug}-source-repaired.glb`);
  return { rootDir, identity, source, reports, repairedSource };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = buildHeavyOptimizePlan(args);
  const write = Boolean(args.write);
  const repairReport = join(plan.reports, "repair-report.json");
  mkdirSync(dirname(repairReport), { recursive: true });
  mkdirSync(dirname(plan.repairedSource), { recursive: true });

  const result = {
    ok: true,
    name: "3d:optimize-heavy",
    identity: plan.identity,
    source: plan.source,
    repairedSource: plan.repairedSource,
    reports: plan.reports,
    stages: [],
    warnings: [],
    fails: []
  };

  if (!write) {
    result.ok = true;
    result.warnings.push("Dry run only; pass --write to run placement repair and heavy optimization.");
    result.stages.push({ name: "repair-source", planned: true, report: repairReport });
    result.stages.push({ name: "optimize-dish", planned: true, heavyAsset: true });
    writeStdout(result, true);
    return;
  }

  const repair = runNode("scripts/3d/repair-source.mjs", [
    "--source", plan.source,
    "--out", plan.repairedSource,
    "--report", repairReport,
    "--write"
  ], plan.rootDir);
  result.stages.push({ name: "repair-source", ...repair });
  if (repair.ok === false) {
    result.ok = false;
    result.fails.push(...(repair.fails ?? ["repair-source failed"]));
    writeStdout(result, true);
    process.exitCode = 1;
    return;
  }

  const optimizeArgs = [
    "--restaurant", plan.identity.restaurantSlug,
    "--menu", plan.identity.menuSlug,
    "--dish", plan.identity.dishSlug,
    "--version", plan.identity.version,
    "--source", plan.repairedSource,
    "--write",
    "--heavy-asset"
  ];
  for (const key of ["cdn-base-url", "approved-by", "visual-threshold"]) {
    if (args[key]) optimizeArgs.push(`--${key}`, String(args[key]));
  }
  if (args["run-visual-compare"]) optimizeArgs.push("--run-visual-compare");
  if (args["allow-public-binaries"]) optimizeArgs.push("--allow-public-binaries");
  const optimize = runNode("scripts/3d/optimize-dish.mjs", optimizeArgs, plan.rootDir);
  result.stages.push({ name: "optimize-dish", ...optimize });
  result.ok = optimize.ok !== false;
  result.fails.push(...(optimize.fails ?? []));
  result.warnings.push(...(repair.warnings ?? []), ...(optimize.warnings ?? []));
  writeStdout(result, true);
  process.exitCode = result.ok ? 0 : 1;
}

if (isMainModule()) main();
