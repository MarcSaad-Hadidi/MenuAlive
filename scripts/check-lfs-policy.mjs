#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ALLOWED_LFS_RULES = new Set();
const DANGEROUS_LFS_EXTENSIONS = [
  ".glb",
  ".gltf",
  ".usdz",
  ".fbx",
  ".obj",
  ".blend",
  ".mp4",
  ".mov",
  ".webm",
  ".zip",
  ".psd",
  ".ai"
];

const REQUIRED_IGNORE_PATTERNS = [
  "3D Plat/",
  "3D photo/",
  "asset-review/",
  "assets/3d/source/**",
  "assets/3d/work/**",
  "public/models/restaurants/**/*.glb",
  "public/models/restaurants/**/*.usdz",
  "public/videos/optimized/*.mp4",
  "public/videos/optimized/*.webm"
];

function runGit(args) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function runGitBuffer(args, options = {}) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
}

function readLines(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8").split(/\r?\n/);
}

function hasWildcard(pattern) {
  return /[*?[{]/.test(pattern);
}

function hasDangerousExtension(pattern) {
  const lower = pattern.toLowerCase();
  return DANGEROUS_LFS_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isLfsPointerBytes(bytes) {
  return bytes
    .subarray(0, 120)
    .toString("utf8")
    .startsWith("version https://git-lfs.github.com/spec/v1");
}

function readTrackedEntries() {
  const output = runGitBuffer(["ls-files", "-s", "-z"]).toString("utf8");
  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^\d+\s+([0-9a-f]{40,64})\s+\d+\t(.+)$/);
      if (!match) return null;
      return { oid: match[1], path: match[2] };
    })
    .filter(Boolean);
}

const violations = [];
const warnings = [];
const lfsRules = [];

for (const [index, rawLine] of readLines(".gitattributes").entries()) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const parts = line.split(/\s+/);
  const pattern = parts[0];
  const isLfs = parts.includes("filter=lfs");
  if (!isLfs) continue;

  lfsRules.push({ line: index + 1, pattern, rawLine });
  if (!ALLOWED_LFS_RULES.has(pattern)) {
    violations.push({
      path: ".gitattributes",
      reason: `unapproved LFS rule '${pattern}' on line ${index + 1}`,
      recommendation:
        "Use file-specific LFS only after asset review; do not add broad binary LFS patterns."
    });
  }
  if (hasWildcard(pattern)) {
    violations.push({
      path: ".gitattributes",
      reason: `broad LFS pattern '${pattern}' on line ${index + 1}`,
      recommendation:
        "Replace broad patterns with an explicit reviewed file path, or store the asset outside Git."
    });
  }
  if (hasDangerousExtension(pattern) && !ALLOWED_LFS_RULES.has(pattern)) {
    violations.push({
      path: ".gitattributes",
      reason: `dangerous binary LFS pattern '${pattern}' is not allowlisted`,
      recommendation:
        "Runtime GLB/USDZ/MP4 files must not silently become LFS pointers."
    });
  }
}

const gitignore = readLines(".gitignore").map((line) => line.trim());
for (const pattern of REQUIRED_IGNORE_PATTERNS) {
  if (!gitignore.includes(pattern)) {
    warnings.push({
      path: ".gitignore",
      reason: `missing recommended ignore pattern '${pattern}'`,
      recommendation:
        "Add the ignore pattern so generated assets stay out of normal git add flows."
    });
  }
}

try {
  let activeLfsPointers = 0;
  for (const entry of readTrackedEntries()) {
    const size = Number(runGit(["cat-file", "-s", entry.oid]).trim());
    if (!Number.isFinite(size) || size > 512) continue;
    const bytes = runGitBuffer(["cat-file", "-p", entry.oid]);
    if (!isLfsPointerBytes(bytes)) continue;

    activeLfsPointers += 1;
    violations.push({
      path: entry.path,
      reason: "current index contains a Git LFS pointer blob",
      recommendation:
        "Remove the LFS dependency from the deploy tree; Vercel must not need Git LFS to clone this branch."
    });
  }
  if (activeLfsPointers === 0) {
    console.log("No Git LFS pointer blobs are active in the current index.");
  }
} catch {
  warnings.push({
    path: "git index",
    reason: "tracked blob inspection could not be executed",
    recommendation:
      "Run this check in a full Git checkout so Vercel-facing LFS pointers can be detected."
  });
}

console.log("Vistaire LFS policy check");
console.log(`Detected LFS rules: ${lfsRules.length}.`);

if (warnings.length > 0) {
  console.log("");
  console.log(`Warnings: ${warnings.length}`);
  for (const item of warnings) {
    console.log(`WARN ${item.path}`);
    console.log(`  reason: ${item.reason}`);
    console.log(`  recommendation: ${item.recommendation}`);
  }
}

if (violations.length === 0) {
  console.log("LFS policy passed.");
} else {
  console.log("");
  console.log(`LFS policy failed: ${violations.length} violation(s).`);
  for (const item of violations) {
    console.log(`FAIL ${item.path}`);
    console.log(`  reason: ${item.reason}`);
    console.log(`  recommendation: ${item.recommendation}`);
  }
}

process.exitCode = violations.length === 0 ? 0 : 1;
