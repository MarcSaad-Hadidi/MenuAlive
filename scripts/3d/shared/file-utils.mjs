import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SCRIPTS_3D_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const ROOT_DIR = normalize(join(SCRIPTS_3D_DIR, "..", ".."));
export const PUBLIC_DIR = join(ROOT_DIR, "public");

export function toPosixPath(value) {
  return value.split(sep).join("/");
}

export function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeJsonFile(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function publicUrlToFilePath(url) {
  const pathname = url.split(/[?#]/)[0].replace(/^\/+/, "");
  const fullPath = normalize(join(PUBLIC_DIR, pathname));
  const publicRoot = normalize(PUBLIC_DIR);
  if (fullPath !== publicRoot && !fullPath.startsWith(`${publicRoot}${sep}`)) {
    throw new Error(`Public URL escapes public/: ${url}`);
  }
  return fullPath;
}

export function workspaceRelative(filePath) {
  return toPosixPath(relative(ROOT_DIR, filePath));
}

export function fileStatsForPublicUrl(url) {
  const filePath = publicUrlToFilePath(url);
  if (!existsSync(filePath)) {
    return {
      exists: false,
      filePath,
      relativePath: workspaceRelative(filePath),
      bytes: 0,
      sha256: ""
    };
  }

  return {
    exists: true,
    filePath,
    relativePath: workspaceRelative(filePath),
    bytes: statSync(filePath).size,
    sha256: sha256File(filePath)
  };
}

export function isGitLfsPointerBytes(bytes) {
  return bytes
    .subarray(0, 64)
    .toString("utf8")
    .startsWith("version https://git-lfs.github.com/spec/v1");
}

export function detectFileKind(filePath) {
  const bytes = readFileSync(filePath);
  if (isGitLfsPointerBytes(bytes)) return "git-lfs-pointer";
  const head4 = bytes.subarray(0, 4).toString("latin1");
  if (head4 === "glTF") return "glb";
  if (head4 === "PK\u0003\u0004") return "usdz";
  const lower = filePath.toLowerCase();
  if (/\.(png|jpe?g|webp|avif|svg)$/.test(lower)) return "image";
  if (/\.json$/.test(lower)) return "json";
  return "unknown";
}
