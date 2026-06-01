import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

function makeFixtureGlb({ translation = [0, 0, 0], duplicate = false } = {}) {
  const points = [
    [-0.25, 0, -0.2],
    [0.25, 0, -0.2],
    [0, 0.08, 0.2],
    [0.5, 0, 0.5],
    [0.502, 0, 0.5],
    [0.501, 0.002, 0.502]
  ];
  const positions = positionsBuffer(duplicate ? [...points, ...points] : points);
  const indices = indicesBuffer(duplicate ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 2, 3, 4, 5]);
  const bin = Buffer.concat([positions, indices]);
  const vertexCount = duplicate ? 12 : 6;
  return makeGlb(
    {
      asset: { version: "2.0", generator: "vistaire-geometry-test" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, translation }],
      buffers: [{ byteLength: bin.length }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: positions.length },
        { buffer: 0, byteOffset: positions.length, byteLength: indices.length }
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: vertexCount,
          type: "VEC3",
          min: [-0.25, 0, -0.2],
          max: [0.502, 0.08, 0.502]
        },
        {
          bufferView: 1,
          componentType: 5123,
          count: duplicate ? 9 : 6,
          type: "SCALAR"
        }
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }]
    },
    bin
  );
}

function withFixture(bytes, fn) {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-geometry-"));
  const filePath = join(dir, "fixture.glb");
  try {
    writeFileSync(filePath, bytes);
    return fn(filePath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("geometry metrics apply node transforms before grounding decisions", () =>
  withFixture(makeFixtureGlb({ translation: [0, -0.25, 0] }), (filePath) => {
    const geometry = analyzeGlbGeometryFile(filePath);

    assert.equal(geometry.bounds.min[1], -0.25);
    assert.equal(geometry.bounds.groundedY, false);
    assert.equal(geometry.bounds.centeredXZ, false);
    assert.equal(geometry.triangles, 2);
  }));

test("geometry metrics flag tiny islands and duplicate shell estimates", () =>
  withFixture(makeFixtureGlb({ duplicate: true }), (filePath) => {
    const geometry = analyzeGlbGeometryFile(filePath);

    assert.equal(geometry.tinyIslandCount >= 1, true);
    assert.equal(geometry.duplicateShellEstimate >= 1, true);
    assert.equal(geometry.vertices, 12);
  }));
