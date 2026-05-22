import { PRODUCTION_3D_BUDGETS, variantBudgetKey } from "./budgets.mjs";

export const DISH_MANIFEST_SCHEMA_VERSION = 1;
export const RESTAURANT_MANIFEST_SCHEMA_VERSION = 1;

export const ALLOWED_STATUSES = Object.freeze([
  "draft",
  "review",
  "approved",
  "published",
  "archived"
]);

export const REQUIRED_VARIANTS = Object.freeze([
  "web",
  "mobile",
  "arLite",
  "iosUsdz",
  "poster"
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const PUBLIC_URL_PATTERN = /^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^?#]+$/;

function add(list, path, message) {
  list.push(`${path}: ${message}`);
}

function isIsoDateOrNull(value) {
  if (value === null) return true;
  if (typeof value !== "string" || !value) return false;
  return !Number.isNaN(Date.parse(value));
}

function allowedRootsForContext(context) {
  if (context === "production") return ["/models/restaurants/"];
  if (context === "demo") return ["/models/demo/"];
  if (context === "demo-fixture") return ["/models/demo/", "/models/restaurants/"];
  return ["/models/restaurants/", "/models/demo/"];
}

function validatePublicUrl(url, path, context, fails) {
  if (typeof url !== "string" || !PUBLIC_URL_PATTERN.test(url)) {
    add(fails, path, "must be a stable public URL without query/hash/traversal");
    return;
  }

  const roots = allowedRootsForContext(context);
  if (!roots.some((root) => url.startsWith(root))) {
    add(fails, path, `must live under ${roots.join(" or ")}`);
  }
}

function validateVariantExtension(key, url, path, fails) {
  const lower = url.toLowerCase();
  if ((key === "web" || key === "mobile" || key === "arLite") && !lower.endsWith(".glb")) {
    add(fails, path, "must point to a .glb file");
  }
  if (key === "iosUsdz" && !lower.endsWith(".usdz")) {
    add(fails, path, "must point to a .usdz file");
  }
  if (key === "poster" && !/\.(png|jpe?g|webp|avif|svg)$/.test(lower)) {
    add(fails, path, "must point to a poster image");
  }
}

function validateVariant(key, variant, context, warnings, fails) {
  const path = `variants.${key}`;
  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    add(fails, path, "is required");
    return;
  }

  validatePublicUrl(variant.url, `${path}.url`, context, fails);
  if (typeof variant.url === "string") {
    validateVariantExtension(key, variant.url, `${path}.url`, fails);
    if (key === "iosUsdz" && /[?#]/.test(variant.url)) {
      add(fails, `${path}.url`, "iosUsdz production URLs must not include query/hash");
    }
  }

  if (!Number.isFinite(variant.bytes) || variant.bytes < 0) {
    add(fails, `${path}.bytes`, "must be a non-negative byte size");
  }
  if (typeof variant.sha256 !== "string" || !SHA256_PATTERN.test(variant.sha256)) {
    add(fails, `${path}.sha256`, "must be a sha256 hex digest");
  }

  const budgetKey = variantBudgetKey(key);
  const budget = PRODUCTION_3D_BUDGETS.variants[budgetKey]?.bytes;
  if (budget && Number.isFinite(variant.bytes)) {
    if (variant.bytes > budget.fail) {
      add(fails, `${path}.bytes`, `exceeds fail budget ${budget.fail}`);
    } else if (variant.bytes > budget.warning) {
      add(warnings, `${path}.bytes`, `exceeds warning budget ${budget.warning}`);
    }
  }
}

export function validateDishManifest(manifest, options = {}) {
  const context = options.context ?? "production";
  const warnings = [];
  const fails = [];

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      valid: false,
      warnings,
      fails: ["manifest: must be an object"]
    };
  }

  for (const field of [
    "restaurantSlug",
    "menuSlug",
    "dishSlug",
    "activeVersion",
    "status",
    "variants",
    "budgets",
    "physicalDimensions",
    "validation",
    "generatedAt",
    "approvedAt",
    "publishedAt"
  ]) {
    if (!(field in manifest)) add(fails, field, "is required");
  }

  for (const field of ["restaurantSlug", "menuSlug", "dishSlug", "activeVersion"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      add(fails, field, "must be a non-empty string");
    }
  }

  if (!ALLOWED_STATUSES.includes(manifest.status)) {
    add(fails, "status", `must be one of ${ALLOWED_STATUSES.join(", ")}`);
  }

  for (const key of REQUIRED_VARIANTS) {
    validateVariant(key, manifest.variants?.[key], context, warnings, fails);
  }

  const dimensions = manifest.physicalDimensions;
  if (!dimensions || typeof dimensions !== "object") {
    add(fails, "physicalDimensions", "must be an object");
  } else {
    if (dimensions.unit !== "meters") add(fails, "physicalDimensions.unit", "must be meters");
    for (const field of ["width", "height", "depth"]) {
      if (!Number.isFinite(dimensions[field]) || dimensions[field] <= 0) {
        add(fails, `physicalDimensions.${field}`, "must be a positive number");
      }
    }
  }

  const validation = manifest.validation;
  if (!validation || typeof validation !== "object") {
    add(fails, "validation", "must be an object");
  } else {
    if (!Array.isArray(validation.warnings)) add(fails, "validation.warnings", "must be an array");
    if (!Array.isArray(validation.fails)) add(fails, "validation.fails", "must be an array");
  }

  for (const field of ["generatedAt", "approvedAt", "publishedAt"]) {
    if (!isIsoDateOrNull(manifest[field])) {
      add(fails, field, "must be an ISO date string or null");
    }
  }

  return {
    valid: fails.length === 0,
    warnings,
    fails
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
