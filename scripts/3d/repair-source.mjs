#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseArgs, writeStdout } from "./shared/file-utils.mjs";
import {
  analyzeGeometryFromGltf,
  analyzeGlbGeometryBuffer,
  parseGlbBuffer
} from "./shared/geometry-metrics.mjs";

const GLB_JSON = 0x4e4f534a;
const GLB_BIN = 0x004e4942;

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

function padJson(value) {
  const raw = Buffer.from(JSON.stringify(value), "utf8");
  return Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 0x20)]);
}

function padBin(value) {
  return Buffer.concat([value, Buffer.alloc((4 - (value.length % 4)) % 4)]);
}

function buildGlb(gltf, binBuffer) {
  const json = padJson(gltf);
  const bin = padBin(binBuffer);
  const totalLength = 12 + 8 + json.length + 8 + bin.length;
  const buffer = Buffer.alloc(totalLength);
  buffer.write("glTF", 0, "ascii");
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  buffer.writeUInt32LE(json.length, 12);
  buffer.writeUInt32LE(GLB_JSON, 16);
  json.copy(buffer, 20);
  const binOffset = 20 + json.length;
  buffer.writeUInt32LE(bin.length, binOffset);
  buffer.writeUInt32LE(GLB_BIN, binOffset + 4);
  bin.copy(buffer, binOffset + 8);
  return buffer;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function ensureParent(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function rootNodesForScene(gltf, sceneIndex) {
  const scene = gltf.scenes?.[sceneIndex];
  if (Array.isArray(scene?.nodes) && scene.nodes.length > 0) return [...scene.nodes];
  return (gltf.nodes ?? []).map((_, index) => index);
}

export function buildRepairPlan({ sourcePath, outPath = null }) {
  const sourceBytes = readFileSync(sourcePath);
  const { gltf, binBuffer } = parseGlbBuffer(sourceBytes);
  const before = analyzeGeometryFromGltf({ gltf, binBuffer });
  const bounds = before.bounds;
  const shift = [
    -((bounds.min[0] + bounds.max[0]) / 2),
    -bounds.min[1],
    -((bounds.min[2] + bounds.max[2]) / 2)
  ].map((value) => Number(value.toFixed(6)));
  const needsPlacementRepair =
    bounds.groundedY !== true ||
    bounds.centeredXZ !== true ||
    shift.some((value) => Math.abs(value) > 0.000001);

  const repairedGltf = JSON.parse(JSON.stringify(gltf));
  if (needsPlacementRepair) {
    if (!Array.isArray(repairedGltf.scenes) || repairedGltf.scenes.length === 0) {
      repairedGltf.scenes = [{ nodes: [] }];
      repairedGltf.scene = 0;
    }
    const sceneIndex = Number.isInteger(repairedGltf.scene) ? repairedGltf.scene : 0;
    repairedGltf.scene = sceneIndex;
    if (!repairedGltf.scenes[sceneIndex]) repairedGltf.scenes[sceneIndex] = { nodes: [] };
    if (!Array.isArray(repairedGltf.nodes)) repairedGltf.nodes = [];
    const originalRoots = rootNodesForScene(repairedGltf, sceneIndex);
    const wrapperNodeIndex = repairedGltf.nodes.length;
    repairedGltf.nodes.push({
      name: "VistaireRootPlacementRepair",
      translation: shift,
      children: originalRoots
    });
    repairedGltf.scenes[sceneIndex].nodes = [wrapperNodeIndex];
    repairedGltf.asset = {
      ...(repairedGltf.asset ?? { version: "2.0" }),
      generator: `${repairedGltf.asset?.generator ? `${repairedGltf.asset.generator}; ` : ""}Vistaire repair-source`
    };
  }

  const repairedBytes = needsPlacementRepair ? buildGlb(repairedGltf, binBuffer) : sourceBytes;
  const after = analyzeGlbGeometryBuffer(repairedBytes);
  const tinyIslandCount = after.tinyIslandCount ?? 0;
  const duplicateShellEstimate = after.duplicateShellEstimate ?? 0;
  return {
    ok: after.bounds.groundedY === true && after.bounds.centeredXZ === true,
    name: "3d:repair-source",
    sourcePath,
    outPath,
    sha256Before: sha256(sourceBytes),
    sha256After: sha256(repairedBytes),
    bytesBefore: sourceBytes.length,
    bytesAfter: repairedBytes.length,
    writeRequired: needsPlacementRepair,
    actions: {
      centerXZ: Math.abs(shift[0]) > 0.000001 || Math.abs(shift[2]) > 0.000001,
      groundY: Math.abs(shift[1]) > 0.000001,
      wrapperNodeTransform: needsPlacementRepair,
      freezeTransforms: false,
      removeTinyIslands: false,
      removeDuplicateShells: false
    },
    warnings: [
      ...(tinyIslandCount > 0 ? [`Detected ${tinyIslandCount} tiny geometry island(s); artist or Blender cleanup may be required.`] : []),
      ...(duplicateShellEstimate > 0 ? [`Detected ${duplicateShellEstimate} duplicate shell/triangle estimate(s); artist cleanup may be required.`] : []),
      "This command repairs placement with a wrapper transform. It does not perform destructive retopology, texture baking, or hidden-shell deletion."
    ],
    fails: after.bounds.groundedY === true && after.bounds.centeredXZ === true
      ? []
      : ["Repair did not produce groundedY=true and centeredXZ=true."],
    before,
    after,
    repairedBytes
  };
}

function serializable(plan) {
  const report = { ...plan };
  delete report.repairedBytes;
  return report;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = normalize(resolve(String(args.source ?? "")));
  if (!sourcePath) throw new Error("--source is required");
  const outPath = args.out ? normalize(resolve(String(args.out))) : null;
  if (args.write && !outPath) throw new Error("--out is required with --write");
  const plan = buildRepairPlan({ sourcePath, outPath });
  if (args.write && outPath) {
    ensureParent(outPath);
    writeFileSync(outPath, plan.repairedBytes);
  }
  const report = serializable(plan);
  if (args.report) {
    const reportPath = normalize(resolve(String(args.report)));
    ensureParent(reportPath);
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  writeStdout(report, true);
  process.exitCode = report.ok ? 0 : 1;
}

if (isMainModule()) main();
