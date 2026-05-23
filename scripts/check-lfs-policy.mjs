#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ALLOWED_LFS_RULES = new Set(["public/models/demo/ravioles-chevre-miel.usdz"]);
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

function isLfsPointer(filePath) {
  if (!existsSync(filePath)) return false;
  const sample = readFileSync(filePath, "utf8").slice(0, 120);
  return sample.startsWith("version https://git-lfs.github.com/spec/v1");
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
  const lfsOutput = runGit(["lfs", "ls-files", "-l"]);
  for (const line of lfsOutput.split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^[0-9a-f]+\s+[-*]\s+(.+)$/i);
    if (!match) continue;
    const filePath = match[1].trim();
    if (filePath.startsWith("public/")) {
      if (isLfsPointer(filePath)) {
        violations.push({
          path: filePath,
          reason: "public runtime asset is an unresolved Git LFS pointer",
          recommendation:
            "Hydrate LFS before build/deploy or move the runtime asset out of LFS."
        });
      } else {
        warnings.push({
          path: filePath,
          reason: "public runtime asset is LFS-tracked and currently hydrated",
          recommendation:
            "Verify Vercel Git LFS is enabled; prefer external storage for future large runtime assets."
        });
      }
    }
  }
} catch {
  warnings.push({
    path: "git lfs",
    reason: "git lfs ls-files could not be executed",
    recommendation:
      "Install Git LFS locally and keep CI checkout configured with lfs: true."
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
