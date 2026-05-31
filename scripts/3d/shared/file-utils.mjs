import { existsSync, readFileSync } from "node:fs";
import { join, normalize, sep } from "node:path";

export function parseArgs(argv = []) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    if (args[key] === undefined) {
      args[key] = next;
    } else if (Array.isArray(args[key])) {
      args[key].push(next);
    } else {
      args[key] = [args[key], next];
    }
    index += 1;
  }
  return args;
}

export function asArray(value) {
  if (value === undefined || value === null || value === false) return [];
  return Array.isArray(value) ? value : [value];
}

export function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeStdout(value, json = false) {
  if (json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${String(value)}\n`);
}

export function publicUrlToFilePath(url, rootDir = process.cwd()) {
  if (/^https?:\/\//i.test(String(url ?? ""))) return null;
  const clean = String(url ?? "").split(/[?#]/)[0].replace(/^\/+/, "");
  const fullPath = normalize(join(rootDir, "public", clean));
  const publicRoot = normalize(join(rootDir, "public"));
  if (fullPath !== publicRoot && !fullPath.startsWith(`${publicRoot}${sep}`)) {
    return null;
  }
  return fullPath;
}

export function fileExists(filePath) {
  return Boolean(filePath && existsSync(filePath));
}

export function defaultDishManifestPath() {
  return "assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json";
}

export function setExitCodeForResult(result, strict = false) {
  process.exitCode = result.ok && (!strict || result.warnings.length === 0) ? 0 : 1;
}
