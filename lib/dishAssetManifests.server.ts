import { existsSync, readFileSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import type { Dish } from "@/lib/demoMenuData";
import {
  applyDishModelAssets,
  resolveDishModelAssets,
  type DishAssetManifest
} from "@/lib/dishModelAssets";

const PUBLIC_DIR = normalize(join(process.cwd(), "public"));

const DEMO_DISH_MANIFESTS = new Map<string, string>([
  [
    "homard-bisque",
    "models/restaurants/maison-elyse/main/homard-bisque/manifest.json"
  ]
]);

function readPublicJson(pathFromPublic: string): DishAssetManifest | null {
  const filePath = normalize(join(PUBLIC_DIR, pathFromPublic));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${sep}`)) {
    return null;
  }
  if (!existsSync(filePath)) return null;

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as DishAssetManifest;
  } catch {
    return null;
  }
}

export function resolveDemoDishModelAssets(dish: Dish): Dish {
  const manifestPath = DEMO_DISH_MANIFESTS.get(dish.slug);
  const manifest = manifestPath ? readPublicJson(manifestPath) : null;
  return applyDishModelAssets(dish, resolveDishModelAssets(dish, manifest));
}

export function resolveDemoDishesModelAssets(dishes: Dish[]): Dish[] {
  return dishes.map(resolveDemoDishModelAssets);
}
