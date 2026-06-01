#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseArgs, writeStdout } from "./shared/file-utils.mjs";
import { analyzeGlbGeometryFile } from "./shared/geometry-metrics.mjs";

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function findSource(rootDir, predicates) {
  const sourceDir = join(rootDir, "3D Plat");
  if (!existsSync(sourceDir)) return null;
  const entries = readdirSync(sourceDir, { withFileTypes: true });
  const match = entries.find((entry) =>
    entry.isFile() &&
    entry.name.toLowerCase().endsWith(".glb") &&
    predicates.some((predicate) => predicate.test(entry.name))
  );
  return match ? join(sourceDir, match.name) : null;
}

function analyzeTarget(target) {
  if (!target.sourcePath || !existsSync(target.sourcePath)) {
    return {
      ...target,
      status: "missing",
      blockers: ["Source GLB was not found in the local workspace."]
    };
  }
  const stat = statSync(target.sourcePath);
  const geometry = analyzeGlbGeometryFile(target.sourcePath);
  const blockers = [];
  if (geometry.bounds.groundedY !== true) blockers.push("Source is not grounded at Y=0.");
  if (geometry.bounds.centeredXZ !== true) blockers.push("Source is not centered on X/Z.");
  if (geometry.triangles > 150_000) blockers.push("Source triangle count is above the AR-lite hard ceiling.");
  if (stat.size > 25 * 1024 * 1024) blockers.push("Source is a heavy asset and requires candidate generation plus visual review.");
  return {
    ...target,
    status: "source_analyzed",
    bytes: stat.size,
    sha256: sha256(target.sourcePath),
    triangles: geometry.triangles,
    vertices: geometry.vertices,
    bounds: geometry.bounds,
    components: geometry.components,
    tinyIslandCount: geometry.tinyIslandCount,
    duplicateShellEstimate: geometry.duplicateShellEstimate,
    blockers
  };
}

function defaultTargets(rootDir) {
  return [
    {
      key: "homard",
      label: "Homard pilot",
      sourcePath: findSource(rootDir, [/homard/i])
    },
    {
      key: "ravioli",
      label: "Ravioli pilot",
      sourcePath: findSource(rootDir, [/ravioli/i, /ravioles/i])
    },
    {
      key: "synthetic-geometry-heavy",
      label: "Synthetic geometry-heavy fixture",
      sourcePath: null,
      fixture: true
    },
    {
      key: "synthetic-texture-heavy",
      label: "Synthetic texture-heavy fixture",
      sourcePath: null,
      fixture: true
    },
    {
      key: "synthetic-mixed-heavy",
      label: "Synthetic mixed-heavy fixture",
      sourcePath: null,
      fixture: true
    },
    {
      key: "synthetic-optimized-control",
      label: "Synthetic already-optimized fixture",
      sourcePath: null,
      fixture: true
    }
  ];
}

export function buildHeavyBenchmark({ rootDir = process.cwd(), extraSource = null, generatedAt = new Date().toISOString() } = {}) {
  const root = normalize(resolve(rootDir));
  const targets = defaultTargets(root);
  if (extraSource) {
    targets.push({
      key: "custom-source",
      label: "Custom source",
      sourcePath: normalize(resolve(extraSource))
    });
  }
  const results = targets.map(analyzeTarget);
  const realResults = results.filter((target) => !target.fixture);
  const realPasses = realResults.filter((target) =>
    target.status === "source_analyzed" &&
    target.blockers.length === 0
  );
  return {
    ok: true,
    name: "3d:benchmark-heavy",
    generatedAt,
    rootDir: root,
    productionClaim: false,
    realHeavyAssetPassed: false,
    realSourceAnalyzedCount: realResults.filter((target) => target.status === "source_analyzed").length,
    sourceOnlyPassCount: realPasses.length,
    note: "This benchmark records source readiness only unless paired with optimize-heavy candidate, visual, CDN, and device QA reports.",
    targets: results
  };
}

function renderMarkdown(report) {
  return [
    "# Vistaire Heavy Asset Benchmark",
    "",
    `Generated at: \`${report.generatedAt}\``,
    "",
    "This report does not claim production readiness. A real dish passes only after optimize-heavy outputs, strict visual evidence, human approval, CDN validation, and real iPhone/Android QA.",
    "",
    "| Target | Status | Bytes | Triangles | Grounded | Centered | Blockers |",
    "| --- | --- | ---: | ---: | --- | --- | --- |",
    ...report.targets.map((target) => [
      target.label,
      target.status,
      Number.isFinite(target.bytes) ? target.bytes : "n/a",
      Number.isFinite(target.triangles) ? target.triangles : "n/a",
      target.bounds?.groundedY === true ? "yes" : "no",
      target.bounds?.centeredXZ === true ? "yes" : "no",
      (target.blockers ?? []).join("; ") || "none"
    ].map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")).map((row) => `| ${row} |`),
    "",
    "## Required follow-up",
    "",
    "- Run `npm run 3d:optimize-heavy -- --write` for each available real source in an external runner workspace.",
    "- Attach candidate reports, visual reports, storage artifact refs, CDN validation, and device QA before making any production claim.",
    ""
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildHeavyBenchmark({
    rootDir: args.root ?? process.cwd(),
    extraSource: args.source,
    generatedAt: args["generated-at"] ? String(args["generated-at"]) : new Date().toISOString()
  });
  if (args.out) {
    const outPath = normalize(resolve(String(args.out)));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, args.markdown ? renderMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`);
  }
  writeStdout(args.markdown ? renderMarkdown(report) : report, !args.markdown);
}

if (isMainModule()) main();
