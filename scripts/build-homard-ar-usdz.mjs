/**
 * Construit un USDZ AR dédié pour le homard à partir du GLB source actuel.
 * Objectif: fiabilité Quick Look iOS (ancrage table + taille réaliste + transforms propres).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { NullEngine, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import "@babylonjs/loaders/glTF/index.js";
import { GLTF2Export, USDZExportAsync } from "@babylonjs/serializers";
import * as fflate from "fflate";

globalThis.fflate = fflate;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(__dirname, "..", "public", "models", "demo");
const SRC_GLB = join(DEMO_DIR, "homard-bisque.glb");
const OUT_AR_GLB = join(DEMO_DIR, "homard-bisque-ar.glb");
const OUT_AR_USDZ = join(DEMO_DIR, "homard-bisque-ar.usdz");
const TARGET_MAX_DIM_METERS = 0.24;

function forcePositiveScales(scene) {
  for (const node of [...scene.transformNodes, ...scene.meshes]) {
    if (!("scaling" in node) || !node.scaling) continue;
    node.scaling = new Vector3(
      Math.abs(node.scaling.x),
      Math.abs(node.scaling.y),
      Math.abs(node.scaling.z)
    );
  }
}

function normalizeForTableAr(scene, targetMaxDimMeters) {
  const meshes = scene.meshes.filter((m) => m.getTotalVertices() > 0);
  if (meshes.length === 0) return;

  const root = new TransformNode("homard-ar-root", scene);
  for (const node of scene.rootNodes) {
    if (node === root) continue;
    if (node instanceof TransformNode) node.setParent(root);
  }

  let bounds = root.getHierarchyBoundingVectors(true);
  const center = bounds.min.add(bounds.max).scale(0.5);
  // Centrage horizontal seulement (Y traité par grounding).
  root.position.subtractInPlace(new Vector3(center.x, 0, center.z));

  bounds = root.getHierarchyBoundingVectors(true);
  const size = bounds.max.subtract(bounds.min);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetMaxDimMeters / maxDim;
  root.scaling = root.scaling.scale(scale);

  bounds = root.getHierarchyBoundingVectors(true);
  // Pose au sol/table: minY = 0.
  root.position.y -= bounds.min.y;
}

async function main() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  await AppendSceneAsync(new Uint8Array(readFileSync(SRC_GLB)), scene, {
    pluginExtension: ".glb",
    name: "homard-bisque.glb"
  });

  forcePositiveScales(scene);
  normalizeForTableAr(scene, TARGET_MAX_DIM_METERS);

  const glb = await GLTF2Export.GLBAsync(scene, "homard-bisque-ar");
  const arGlbBytes = Buffer.from(
    await glb.glTFFiles["homard-bisque-ar.glb"].arrayBuffer()
  );
  writeFileSync(OUT_AR_GLB, arGlbBytes);

  const usdzBytes = await USDZExportAsync(scene, {
    includeAnchoringProperties: true,
    modelFileName: "model.usda"
  });
  writeFileSync(OUT_AR_USDZ, Buffer.from(usdzBytes));

  console.log(
    `OK homard AR: GLB ${(arGlbBytes.byteLength / 1024).toFixed(1)} KB, USDZ ${(usdzBytes.byteLength / 1024).toFixed(1)} KB`
  );

  scene.dispose();
  engine.dispose();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
