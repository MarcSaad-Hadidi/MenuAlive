import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

async function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-final-3d-"));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function padJson(value) {
  const raw = Buffer.from(JSON.stringify(value), "utf8");
  const padding = (4 - (raw.length % 4)) % 4;
  return Buffer.concat([raw, Buffer.alloc(padding, 0x20)]);
}

function padBin(bytes) {
  const padding = (4 - (bytes.length % 4)) % 4;
  return Buffer.concat([bytes, Buffer.alloc(padding)]);
}

function makeGlb(gltf, bin = Buffer.alloc(64)) {
  const json = padJson(gltf);
  const binChunk = padBin(bin);
  const totalLength = 12 + 8 + json.length + 8 + binChunk.length;
  const buffer = Buffer.alloc(totalLength);
  buffer.write("glTF", 0, "utf8");
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  buffer.writeUInt32LE(json.length, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  json.copy(buffer, 20);
  const binHeaderOffset = 20 + json.length;
  buffer.writeUInt32LE(binChunk.length, binHeaderOffset);
  buffer.writeUInt32LE(0x004e4942, binHeaderOffset + 4);
  binChunk.copy(buffer, binHeaderOffset + 8);
  return buffer;
}

function makeDishGltf(overrides = {}) {
  return {
    asset: { version: "2.0", generator: "vistaire-final-test" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Assiette" }],
    buffers: [{ byteLength: 64 }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 6 }
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-0.25, 0, -0.2],
        max: [0.25, 0.08, 0.2]
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: 3,
        type: "SCALAR"
      }
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ name: "Sauce champagne", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    textures: [{ source: 0 }],
    images: [{ bufferView: 0, mimeType: "image/png", name: "albedo" }],
    extensionsUsed: ["KHR_materials_unlit"],
    ...overrides
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function runNode(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd(), ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("analyze-source emits source evidence, geometry metrics, and a markdown review note", () =>
  withTempDir(async (dir) => {
    const sourcePath = join(dir, "source", "dish.glb");
    const reportPath = join(dir, "reports", "analysis.json");
    const markdownPath = join(dir, "reports", "analysis.md");
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, makeGlb(makeDishGltf()));

    const result = await runNode([
      "scripts/3d/analyze-source.mjs",
      "--source",
      sourcePath,
      "--out",
      reportPath,
      "--markdown",
      markdownPath,
      "--json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(existsSync(reportPath), true);
    assert.equal(existsSync(markdownPath), true);
    const parsed = readJson(reportPath);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.metrics.bytes, readFileSync(sourcePath).byteLength);
    assert.equal(parsed.metrics.sha256, sha256(readFileSync(sourcePath)));
    assert.equal(parsed.metrics.meshes, 1);
    assert.equal(parsed.metrics.primitives, 1);
    assert.equal(parsed.metrics.vertices, 3);
    assert.equal(parsed.metrics.triangles, 1);
    assert.deepEqual(parsed.metrics.bounds.dimensionsMeters, [0.5, 0.08, 0.4]);
    assert.deepEqual(parsed.metrics.externalUris, []);
  }));

test("optimize-dish writes versioned variants, manifest v2, visual evidence, and validation reports", () =>
  withTempDir(async (dir) => {
    const sourcePath = join(dir, "assets", "3d", "source", "maison-elyse", "demo", "plat-final", "source.glb");
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, makeGlb(makeDishGltf()));

    const result = await runNode([
      "scripts/3d/optimize-dish.mjs",
      "--restaurant",
      "maison-elyse",
      "--menu",
      "demo",
      "--dish",
      "plat-final",
      "--version",
      "vfinal",
      "--source",
      sourcePath,
      "--root",
      dir,
      "--write",
      "--allow-public-binaries",
      "--approved-by",
      "QA Bot",
      "--json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const manifestPath = join(
      dir,
      "public",
      "models",
      "restaurants",
      "maison-elyse",
      "demo",
      "plat-final",
      "vfinal",
      "manifest.json"
    );
    const manifest = readJson(manifestPath);
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.status, "approved");
    assert.equal(manifest.validationStatus, "passed");
    assert.equal(manifest.quality.manualReview.status, "approved");
    assert.equal(manifest.visualQuality.status, "passed");
    assert.equal(manifest.sourceAnalysis.triangles, 1);
    for (const key of ["web", "mobile", "arLite", "iosUsdz", "poster"]) {
      assert.equal(existsSync(join(dir, "public", manifest.variants[key].url)), true, key);
      assert.equal(typeof manifest.variants[key].sha256, "string");
      assert.equal(manifest.variants[key].sha256.length, 64);
    }
    assert.equal(existsSync(join(dir, "assets", "3d", "reports", "maison-elyse", "demo", "plat-final", "vfinal", "visual-quality.json")), true);
  }));

test("optimize-dish refuses CDN mode unless public binary writes are explicitly allowed", () =>
  withTempDir(async (dir) => {
    const sourcePath = join(dir, "assets", "3d", "source", "maison-elyse", "demo", "plat-final", "source.glb");
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, makeGlb(makeDishGltf()));

    const result = await runNode([
      "scripts/3d/optimize-dish.mjs",
      "--restaurant",
      "maison-elyse",
      "--menu",
      "demo",
      "--dish",
      "plat-final",
      "--version",
      "vcdn",
      "--source",
      sourcePath,
      "--root",
      dir,
      "--write",
      "--cdn-base-url",
      "https://cdn.example.com/vistaire",
      "--json"
    ]);

    assert.equal(result.code, 1);
    assert.match(result.stdout, /allow-public-binaries/i);
    assert.equal(
      existsSync(join(dir, "public", "models", "restaurants", "maison-elyse", "demo", "plat-final", "vcdn")),
      false
    );
  }));

test("publish promotes an approved version and rollback restores the previous active version", () =>
  withTempDir(async (dir) => {
    const sourcePath = join(dir, "assets", "3d", "source", "maison-elyse", "demo", "plat-final", "source.glb");
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, makeGlb(makeDishGltf()));

    for (const version of ["v1", "v2"]) {
      const optimize = await runNode([
        "scripts/3d/optimize-dish.mjs",
        "--restaurant",
        "maison-elyse",
        "--menu",
        "demo",
        "--dish",
        "plat-final",
        "--version",
        version,
        "--source",
        sourcePath,
        "--root",
        dir,
        "--write",
        "--allow-public-binaries",
        "--approved-by",
        "QA Bot",
        "--json"
      ]);
      assert.equal(optimize.code, 0, optimize.stderr);

      const manifestPath = join(
        dir,
        "public",
        "models",
        "restaurants",
        "maison-elyse",
        "demo",
        "plat-final",
        version,
        "manifest.json"
      );
      const publish = await runNode([
        "scripts/3d/publish.mjs",
        "--manifest",
        manifestPath,
        "--root",
        dir,
        "--write",
        "--quality-approved",
        "--approved-by",
        "QA Bot",
        "--json"
      ]);
      assert.equal(publish.code, 0, publish.stderr);
    }

    const activeManifestPath = join(
      dir,
      "public",
      "models",
      "restaurants",
      "maison-elyse",
      "demo",
      "plat-final",
      "manifest.json"
    );
    assert.equal(readJson(activeManifestPath).activeVersion, "v2");

    const rollback = await runNode([
      "scripts/3d/rollback.mjs",
      "--restaurant",
      "maison-elyse",
      "--menu",
      "demo",
      "--dish",
      "plat-final",
      "--to",
      "v1",
      "--root",
      dir,
      "--write",
      "--approved-by",
      "QA Bot",
      "--json"
    ]);
    assert.equal(rollback.code, 0, rollback.stderr);
    const rolledBack = readJson(activeManifestPath);
    assert.equal(rolledBack.activeVersion, "v1");
    assert.equal(rolledBack.status, "published");
    assert.equal(rolledBack.rollback.fromVersion, "v2");
    assert.equal(rolledBack.rollback.toVersion, "v1");
  }));

test("clean-stale refuses write mode when no active manifest exists", () =>
  withTempDir(async (dir) => {
    const versionOne = join(
      dir,
      "public",
      "models",
      "restaurants",
      "maison-elyse",
      "demo",
      "plat-final",
      "v1"
    );
    const versionTwo = join(dirname(versionOne), "v2");
    mkdirSync(versionOne, { recursive: true });
    mkdirSync(versionTwo, { recursive: true });
    writeFileSync(join(versionOne, "marker.txt"), "keep v1");
    writeFileSync(join(versionTwo, "marker.txt"), "keep v2");

    const result = await runNode([
      "scripts/3d/clean-stale.mjs",
      "--restaurant",
      "maison-elyse",
      "--menu",
      "demo",
      "--dish",
      "plat-final",
      "--root",
      dir,
      "--write",
      "--json"
    ]);

    assert.equal(result.code, 1);
    assert.match(result.stdout, /active manifest/i);
    assert.equal(existsSync(versionOne), true);
    assert.equal(existsSync(versionTwo), true);
  }));
