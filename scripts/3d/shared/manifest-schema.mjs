import {
  ALLOWED_STATUSES,
  ALLOWED_VALIDATION_STATUSES,
  REQUIRED_VARIANTS,
  validateDishManifestSchema,
  validateRestaurantManifestSchema
} from "./validators/manifest-schema.mjs";

export const DISH_MANIFEST_SCHEMA_VERSION = 1;
export const RESTAURANT_MANIFEST_SCHEMA_VERSION = 1;
export { ALLOWED_STATUSES, ALLOWED_VALIDATION_STATUSES, REQUIRED_VARIANTS };

export function validateDishManifest(manifest, options = {}) {
  return validateDishManifestSchema(manifest, options);
}

export function validateRestaurantManifest(manifest) {
  return validateRestaurantManifestSchema(manifest);
}

function rollupValidationStatus(statuses) {
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("unvalidated")) return "unvalidated";
  return "passed";
}

export function summarizeRestaurantManifest(
  restaurantSlug,
  dishManifests,
  { generatedAt = new Date().toISOString() } = {}
) {
  const dishes = dishManifests.map((manifest) => ({
    menuSlug: manifest.menuSlug,
    dishSlug: manifest.dishSlug,
    activeVersion: manifest.activeVersion,
    status: manifest.status,
    validationStatus: manifest.validationStatus ?? "unvalidated"
  }));
  const menus = [...new Set(dishes.map((dish) => dish.menuSlug))].map((menuSlug) => ({
    menuSlug,
    activeVersions: Object.fromEntries(
      dishes
        .filter((dish) => dish.menuSlug === menuSlug)
        .map((dish) => [dish.dishSlug, dish.activeVersion])
    ),
    dishes: dishes.filter((dish) => dish.menuSlug === menuSlug).map((dish) => dish.dishSlug)
  }));

  return {
    schemaVersion: RESTAURANT_MANIFEST_SCHEMA_VERSION,
    kind: "vistaire.restaurant-3d-manifest",
    restaurantSlug,
    generatedAt,
    menus,
    dishes,
    activeVersions: Object.fromEntries(
      dishes.map((dish) => [`${dish.menuSlug}/${dish.dishSlug}`, dish.activeVersion])
    ),
    validationStatus: rollupValidationStatus(
      dishManifests.map((manifest) => manifest.validationStatus ?? "unvalidated")
    ),
    validation: {
      warnings: dishManifests.flatMap((manifest) => manifest.validation?.warnings ?? []),
      fails: dishManifests.flatMap((manifest) => manifest.validation?.fails ?? [])
    },
    metrics: {
      manifestCount: dishManifests.length,
      publishedDishCount: dishManifests.filter((manifest) => manifest.status === "published").length,
      failedDishCount: dishManifests.filter((manifest) => manifest.validationStatus === "failed").length
    }
  };
}
