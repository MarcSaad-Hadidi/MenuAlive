/**
 * Convertit les GLB démo en USDZ pour Quick Look / ios-src (model-viewer).
 * Utilise Babylon.js (NullEngine) + fflate — fonctionne sur Windows sans Xcode.
 *
 * Prérequis : les fichiers .glb dans public/models/demo/
 *   npm run demo:generate-3d
 *
 * Puis :
 *   npm run demo:convert-usdz
 */
/* global globalThis */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { NullEngine, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import "@babylonjs/loaders/glTF/index.js";
import { USDZExportAsync } from "@babylonjs/serializers";
import * as fflate from "fflate";

/** Babylon USDZ exporter attend `fflate` global (navigateur charge un script CDN sinon). */
globalThis.fflate = fflate;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(__dirname, "..", "public", "models", "demo");

const FILES = [
  "ravioles-chevre-miel.glb",
  "homard-bisque.glb",
  "souffle-chocolat.glb",
  "maison-elyse-n1.glb"
];

/**
 * Normalisation AR (USDZ only) :
 * - centre X/Z à l’origine,
 * - pose le bas du modèle à y=0 (sur la table),
 * - réduit la plus grande dimension à targetMaxDimMeters.
 */
function normalizeSceneForAr(scene, targetMaxDimMeters) {
  const meshes = scene.meshes.filter((m) => m.getTotalVertices() > 0);
  if (meshes.length === 0) return;

  const group = new TransformNode("ar-normalize-root", scene);

  for (const node of scene.rootNodes) {
    if (node === group) continue;
    if (node instanceof TransformNode) {
      node.setParent(group);
    }
  }

  const boundsBefore = group.getHierarchyBoundingVectors(true);
  const center = boundsBefore.min.add(boundsBefore.max).scale(0.5);
  group.position.subtractInPlace(new Vector3(center.x, 0, center.z));

  const boundsCentered = group.getHierarchyBoundingVectors(true);
  const size = boundsCentered.max.subtract(boundsCentered.min);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetMaxDimMeters / maxDim;
  group.scaling = group.scaling.scale(scale);

  const boundsScaled = group.getHierarchyBoundingVectors(true);
  group.position.y -= boundsScaled.min.y;
}

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

async function convertOne(glbName) {
  const glbPath = join(DEMO_DIR, glbName);
  if (!existsSync(glbPath)) {
    console.error(`Fichier manquant : ${glbPath}`);
    console.error("Exécutez d’abord : npm run demo:generate-3d");
    process.exitCode = 1;
    return;
  }

  const engine = new NullEngine();
  const scene = new Scene(engine);
  const data = readFileSync(glbPath);

  await AppendSceneAsync(new Uint8Array(data), scene, {
    pluginExtension: ".glb",
    name: glbName
  });

  // Le homard importé est centré autour de (0,0,0) et trop grand pour AR table:
  // on le recale uniquement pour l'export USDZ afin d'éviter "AR ouvert mais rien visible".
  if (glbName === "homard-bisque.glb") {
    forcePositiveScales(scene);
    normalizeSceneForAr(scene, 0.25);
  }

  const meshCount = scene.meshes.filter((m) => m.getTotalVertices() > 0).length;
  if (meshCount === 0) {
    console.warn(
      `Avertissement ${glbName} : aucun mesh exportable après chargement — USDZ peut être vide.`
    );
  }

  const bytes = await USDZExportAsync(scene, {
    includeAnchoringProperties: true,
    modelFileName: "model.usda"
  });

  if (!bytes?.byteLength) {
    console.error(`Échec export USDZ : ${glbName}`);
    process.exitCode = 1;
    scene.dispose();
    engine.dispose();
    return;
  }

  const usdzName = glbName.replace(/\.glb$/i, ".usdz");
  const usdzPath = join(DEMO_DIR, usdzName);
  writeFileSync(usdzPath, Buffer.from(bytes));
  console.log(
    `OK ${usdzName} (${(bytes.byteLength / 1024).toFixed(1)} KB, ${meshCount} mesh)`
  );

  scene.dispose();
  engine.dispose();
}

async function main() {
  for (const f of FILES) {
    await convertOne(f);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
