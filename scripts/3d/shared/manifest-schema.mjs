import {
  ALLOWED_STATUSES,
  REQUIRED_VARIANTS,
  validateDishManifestSchema
} from "./validators/manifest-schema.mjs";

export const DISH_MANIFEST_SCHEMA_VERSION = 1;
export const RESTAURANT_MANIFEST_SCHEMA_VERSION = 1;
export { ALLOWED_STATUSES, REQUIRED_VARIANTS };

export function validateDishManifest(manifest, options = {}) {
  const result = validateDishManifestSchema(manifest, options);
  return {
    valid: result.ok,
    warnings: result.warnings,
    fails: result.fails,
    metrics: result.metrics,
    evidence: result.evidence
  };
}

function rankStatus(statuses) {
  if (statuses.includes("published")) return "published";
  if (statuses.includes("approved")) return "approved";
  if (statuses.includes("review")) return "review";
  if (statuses.includes("draft")) return "draft";
  if (statuses.includes("archived")) return "archived";
  return "draft";
}

export function summarizeRestaurantManifest(restaurantSlug, dishManifests) {
  const generatedAt = new Date().toISOString();
  const dishes = dishManifests.map((manifest) => ({
    menuSlug: manifest.menuSlug,
    dishSlug: manifest.dishSlug,
    activeVersion: manifest.activeVersion,
    status: manifest.status,
    validationStatus:
      manifest.validation?.fails?.length > 0 ? "failed" : manifest.status
  }));
  const menus = [...new Set(dishManifests.map((manifest) => manifest.menuSlug))].map(
    (menuSlug) => ({
      menuSlug,
      dishes: dishes
        .filter((dish) => dish.menuSlug === menuSlug)
        .map((dish) => dish.dishSlug)
    })
  );
  const activeVersions = Object.fromEntries(
    dishManifests.map((manifest) => [
      `${manifest.menuSlug}/${manifest.dishSlug}`,
      manifest.activeVersion
    ])
  );
  const hasFails = dishManifests.some((manifest) => manifest.validation?.fails?.length > 0);

  return {
    schemaVersion: RESTAURANT_MANIFEST_SCHEMA_VERSION,
    restaurantSlug,
    menus,
    dishes,
    activeVersions,
    globalValidationStatus: hasFails
      ? "failed"
      : rankStatus(dishManifests.map((manifest) => manifest.status)),
    generatedAt
  };
}
