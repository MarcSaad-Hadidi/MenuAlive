import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { analyzeGlbGeometryFile } from "../scripts/3d/shared/geometry-metrics.mjs";

function padJson(value) {
  const raw = Buffer.from(JSON.stringify(value), "utf8");
  return Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 0x20)]);
}

function padBin(value) {
  return Buffer.concat([value, Buffer.alloc((4 - (value.length % 4)) % 4)]);
}

function makeGlb(gltf, bin) {
  const json = padJson(gltf);
  const binChunk = padBin(bin);
  const totalLength = 12 + 8 + json.length + 8 + binChunk.length;
  const buffer = Buffer.alloc(totalLength);
  buffer.write("glTF", 0, "ascii");
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  buffer.writeUInt32LE(json.length, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  json.copy(buffer, 20);
  const binOffset = 20 + json.length;
  buffer.writeUInt32LE(binChunk.length, binOffset);
  buffer.writeUInt32LE(0x004e4942, binOffset + 4);
  binChunk.copy(buffer, binOffset + 8);
  return buffer;
}

function positionsBuffer(points) {
  const out = Buffer.alloc(points.length * 12);
  points.flat().forEach((value, index) => out.writeFloatLE(value, index * 4));
  return out;
}

function indicesBuffer(indices) {
  const out = Buffer.alloc(indices.length * 2);
  indices.forEach((value, index) => out.writeUInt16LE(value, index * 2));
  return out;
}

function translatedTriangleGlb() {
  const points = [
    [-0.25, 0, -0.2],
    [0.25, 0, -0.2],
    [0, 0.08, 0.2]
  ];
  const positions = positionsBuffer(points);
  const indices = indicesBuffer([0, 1, 2]);
  const bin = Buffer.concat([positions, indices]);
  return makeGlb(
    {
      asset: { version: "2.0", generator: "vistaire-heavy-command-test" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, translation: [0.3, -0.25, 0.4] }],
      buffers: [{ byteLength: bin.length }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: positions.length },
        { buffer: 0, byteOffset: positions.length, byteLength: indices.length }
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" }
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }]
    },
    bin
  );
}

function parseJsonCommand(args, cwd = process.cwd()) {
  const stdout = execFileSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true
  });
  return JSON.parse(stdout);
}

test("repair-source grounds and centers a translated GLB without writing runtime assets", () => {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-repair-source-"));
  try {
    const source = join(dir, "source.glb");
    const out = join(dir, "repaired.glb");
    const reportPath = join(dir, "repair-report.json");
    writeFileSync(source, translatedTriangleGlb());

    const result = parseJsonCommand([
      "scripts/3d/repair-source.mjs",
      "--source",
      source,
      "--out",
      out,
      "--report",
      reportPath,
      "--write"
    ]);

    assert.equal(result.ok, true);
    assert.equal(existsSync(out), true);
    assert.equal(existsSync(reportPath), true);
    const geometry = analyzeGlbGeometryFile(out);
    assert.equal(geometry.bounds.groundedY, true);
    assert.equal(geometry.bounds.centeredXZ, true);
    assert.equal(JSON.parse(readFileSync(reportPath, "utf8")).actions.wrapperNodeTransform, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("benchmark-heavy keeps missing real sources and synthetic fixtures honest", () => {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-benchmark-heavy-"));
  try {
    const result = parseJsonCommand(["scripts/3d/benchmark-heavy.mjs", "--root", dir]);

    assert.equal(result.productionClaim, false);
    assert.equal(result.realHeavyAssetPassed, false);
    assert.equal(result.targets.some((target) => target.key === "homard" && target.status === "missing"), true);
    assert.equal(result.targets.some((target) => target.key === "synthetic-geometry-heavy" && target.status === "missing"), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("retouch-report turns heavy source metrics into artist instructions", () => {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-retouch-report-"));
  try {
    const sourceAnalysis = join(dir, "source-analysis.json");
    writeFileSync(
      sourceAnalysis,
      JSON.stringify({
        metrics: {
          bytes: 30 * 1024 * 1024,
          triangles: 240_000,
          images: 16,
          textures: 12,
          bounds: { groundedY: false, centeredXZ: false },
          geometry: { tinyIslandCount: 2, duplicateShellEstimate: 1 }
        }
      })
    );

    const result = parseJsonCommand([
      "scripts/3d/retouch-report.mjs",
      "--source-analysis",
      sourceAnalysis,
      "--json"
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.instructions.some((item) => /AR mesh under 70k triangles/.test(item)), true);
    assert.equal(result.instructions.some((item) => /Center the plated dish/.test(item)), true);
    assert.equal(result.instructions.some((item) => /duplicate shells/.test(item)), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
