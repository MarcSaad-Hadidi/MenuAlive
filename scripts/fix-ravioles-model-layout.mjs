import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  Color3,
  Matrix,
  MeshBuilder,
  NullEngine,
  PBRMaterial,
  Scene
} from "@babylonjs/core";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import "@babylonjs/loaders/glTF/index.js";
import { GLTF2Export } from "@babylonjs/serializers/glTF/2.0/glTFSerializer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = join(
  __dirname,
  "..",
  "public",
  "models",
  "demo",
  "ravioles-chevre-miel.glb"
);

function renderableMeshes(scene) {
  return scene.meshes.filter((mesh) => mesh.getTotalVertices() > 0);
}

function isPlateMesh(mesh) {
  const name = `${mesh.name} ${mesh.material?.name ?? ""}`.toLowerCase();
  return (
    name.includes("assiette") ||
    name.includes("rebord") ||
    name.includes("céramique") ||
    name.includes("ceramique")
  );
}

function isLooseRim(mesh) {
  return mesh.name.toLowerCase().includes("rebord");
}

function boundsFor(scene, meshes) {
  const bounds = scene.getWorldExtends((mesh) => meshes.includes(mesh));
  return { min: bounds.min, max: bounds.max, size: bounds.max.subtract(bounds.min) };
}

function formatVector(v) {
  return v.asArray().map((n) => Number(n.toFixed(5)));
}

function logBounds(label, bounds) {
  console.log(
    `${label}: min=${JSON.stringify(formatVector(bounds.min))} max=${JSON.stringify(
      formatVector(bounds.max)
    )} size=${JSON.stringify(formatVector(bounds.size))}`
  );
}

function bakeTranslate(meshes, y) {
  const translation = Matrix.Translation(0, y, 0);
  for (const mesh of meshes) {
    mesh.bakeTransformIntoVertices(translation);
    mesh.refreshBoundingInfo(true);
  }
}

function makeCeramicMaterial(scene) {
  const material = new PBRMaterial("ravioles-ceramic-opaque-surface", scene);
  material.albedoColor = new Color3(0.96, 0.92, 0.84);
  material.metallic = 0;
  material.roughness = 0.58;
  material.alpha = 1;
  material.transparencyMode = PBRMaterial.PBRMATERIAL_OPAQUE;
  material.backFaceCulling = false;
  return material;
}

async function main() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  await AppendSceneAsync(new Uint8Array(readFileSync(MODEL_PATH)), scene, {
    pluginExtension: ".glb",
    name: "ravioles-chevre-miel.glb"
  });

  const looseRims = renderableMeshes(scene).filter(isLooseRim);
  for (const rim of looseRims) {
    rim.dispose(false, true);
  }

  const meshes = renderableMeshes(scene);
  const plateMeshes = meshes.filter(isPlateMesh);
  const foodMeshes = meshes.filter((mesh) => !isPlateMesh(mesh));
  if (plateMeshes.length === 0 || foodMeshes.length === 0) {
    throw new Error("Impossible de distinguer l'assiette et la nourriture ravioles.");
  }

  const before = boundsFor(scene, renderableMeshes(scene));
  const plateBounds = boundsFor(scene, plateMeshes);
  const foodBounds = boundsFor(scene, foodMeshes);
  logBounds("ravioles GLB avant", before);
  logBounds("assiette avant", plateBounds);
  logBounds("nourriture avant", foodBounds);

  for (const material of scene.materials) {
    const name = material.name.toLowerCase();
    if (!name.includes("céramique") && !name.includes("ceramique")) continue;
    material.alpha = 1;
    material.transparencyMode = PBRMaterial.PBRMATERIAL_OPAQUE;
    material.albedoColor = new Color3(0.96, 0.92, 0.84);
    material.metallic = 0;
    material.roughness = 0.58;
    material.backFaceCulling = false;
  }

  const plateSize = plateBounds.size;
  const plateTopY = plateBounds.max.y;
  const support = MeshBuilder.CreateCylinder(
    "ravioles-opaque-plate-surface",
    {
      height: 0.006,
      diameter: Math.max(plateSize.x, plateSize.z) * 0.9,
      tessellation: 128
    },
    scene
  );
  support.position.set(
    (plateBounds.min.x + plateBounds.max.x) / 2,
    plateTopY + 0.001,
    (plateBounds.min.z + plateBounds.max.z) / 2
  );
  support.material = makeCeramicMaterial(scene);

  // Le mesh alimentaire contient quelques points bas, mais les ravioles visibles
  // restent trop éloignées de l'assiette. On descend légèrement le bloc alimentaire.
  bakeTranslate(foodMeshes, -0.035);

  const after = boundsFor(scene, renderableMeshes(scene));
  logBounds("ravioles GLB après", after);
  console.log(`rebords supprimés=${looseRims.length}`);

  const glb = await GLTF2Export.GLBAsync(scene, "ravioles-chevre-miel.glb", {
    exportWithoutWaitingForScene: true,
    removeNoopRootNodes: false
  });
  const blob = glb.files["ravioles-chevre-miel.glb"];
  if (!blob || typeof blob === "string") {
    throw new Error("Export GLB ravioles invalide.");
  }

  writeFileSync(MODEL_PATH, Buffer.from(await blob.arrayBuffer()));
  console.log(`OK ${MODEL_PATH}`);

  scene.dispose();
  engine.dispose();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
