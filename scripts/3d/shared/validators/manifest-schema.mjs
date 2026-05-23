import { validateBudgets } from "./budget-checks.mjs";
import { addFail, addWarning, createValidationResult } from "./file-exists.mjs";

export const ALLOWED_STATUSES = Object.freeze([
  "draft",
  "review",
  "approved",
  "published",
  "archived"
]);

export const REQUIRED_VARIANTS = Object.freeze([
  "web",
  "arLite",
  "iosUsdz"
]);
const OPTIONAL_VARIANTS = Object.freeze([
  "mobile",
  "poster"
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const PUBLIC_URL_PATTERN = /^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^?#]+$/;
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function pathMessage(path, message) {
  return `${path}: ${message}`;
}

function isIsoDateOrNull(value) {
  if (value === null) return true;
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function allowedRootsForContext(context) {
  if (context === "production") return ["/models/restaurants/"];
  if (context === "demo") return ["/models/demo/"];
  if (context === "demo-fixture") return ["/models/demo/", "/models/restaurants/"];
  return ["/models/restaurants/", "/models/demo/"];
}

function validatePublicUrl(result, url, path, context) {
  if (typeof url !== "string" || !PUBLIC_URL_PATTERN.test(url)) {
    addFail(result, pathMessage(path, "must be a stable public URL without query/hash/traversal"));
    return;
  }

  const roots = allowedRootsForContext(context);
  if (!roots.some((root) => url.startsWith(root))) {
    addFail(result, pathMessage(path, `must live under ${roots.join(" or ")}`));
  }
}

function validateVariantExtension(result, key, url, path) {
  const lower = String(url ?? "").toLowerCase();
  if ((key === "web" || key === "mobile" || key === "arLite") && !lower.endsWith(".glb")) {
    addFail(result, pathMessage(path, "must point to a .glb file"));
  }
  if (key === "iosUsdz" && !lower.endsWith(".usdz")) {
    addFail(result, pathMessage(path, "must point to a .usdz file"));
  }
  if (key === "poster" && !/\.(png|jpe?g|webp|avif|svg)$/.test(lower)) {
    addFail(result, pathMessage(path, "must point to a poster image"));
  }
}

function validateVariant(result, key, variant, context) {
  const path = `variants.${key}`;
  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    addFail(result, pathMessage(path, "is required"));
    return;
  }

  validatePublicUrl(result, variant.url, `${path}.url`, context);
  validateVariantExtension(result, key, variant.url, `${path}.url`);
  if (key === "iosUsdz" && typeof variant.url === "string" && /[?#]/.test(variant.url)) {
    addFail(result, pathMessage(`${path}.url`, "iosUsdz production URLs must not include query/hash"));
  }

  if (!Number.isFinite(variant.bytes) || variant.bytes <= 0) {
    addFail(result, pathMessage(`${path}.bytes`, "must be a positive byte size"));
  }

  if ("sha256" in variant) {
    if (typeof variant.sha256 !== "string" || !SHA256_PATTERN.test(variant.sha256)) {
      addFail(result, pathMessage(`${path}.sha256`, "must be a sha256 hex digest"));
    }
  } else if (context === "production") {
    addFail(result, pathMessage(`${path}.sha256`, "is required for production manifests"));
  } else {
    addWarning(result, pathMessage(`${path}.sha256`, "is absent; hash validation will be skipped"));
  }
}

function validateDimensions(result, dimensions) {
  if (!dimensions || typeof dimensions !== "object" || Array.isArray(dimensions)) {
    addFail(result, pathMessage("physicalDimensions", "must be an object"));
    return;
  }

  if (dimensions.unit !== "meters") {
    addFail(result, pathMessage("physicalDimensions.unit", "must be meters"));
  }
  for (const field of ["width", "height", "depth"]) {
    if (!Number.isFinite(dimensions[field]) || dimensions[field] <= 0) {
      addFail(result, pathMessage(`physicalDimensions.${field}`, "must be a positive number"));
    }
  }
}

function validateLifecycleDates(result, manifest, context) {
  for (const field of ["generatedAt", "approvedAt", "publishedAt"]) {
    if (!isIsoDateOrNull(manifest[field])) {
      addFail(result, pathMessage(field, "must be an ISO UTC date string or null"));
    }
  }

  if (context === "production" && manifest.status === "approved" && !manifest.approvedAt) {
    addFail(result, "approvedAt: is required when production status is approved");
  }
  if (context === "production" && manifest.status === "published") {
    if (!manifest.approvedAt) addFail(result, "approvedAt: is required when production status is published");
    if (!manifest.publishedAt) addFail(result, "publishedAt: is required when production status is published");
  }
}

export function validateDishManifestSchema(manifest, options = {}) {
  const context = options.context ?? "production";
  const result = createValidationResult({
    name: "manifest-schema",
    metrics: {
      context,
      budgetChecks: []
    }
  });

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return addFail(result, "manifest: must be an object");
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
    if (!(field in manifest)) addFail(result, pathMessage(field, "is required"));
  }

  for (const field of ["restaurantSlug", "menuSlug", "dishSlug", "activeVersion"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      addFail(result, pathMessage(field, "must be a non-empty string"));
    }
  }

  if (!ALLOWED_STATUSES.includes(manifest.status)) {
    addFail(result, pathMessage("status", `must be one of ${ALLOWED_STATUSES.join(", ")}`));
  }

  for (const key of REQUIRED_VARIANTS) {
    validateVariant(result, key, manifest.variants?.[key], context);
  }
  for (const key of OPTIONAL_VARIANTS) {
    if (manifest.variants?.[key]) {
      validateVariant(result, key, manifest.variants[key], context);
    }
  }

  validateDimensions(result, manifest.physicalDimensions);

  const validation = manifest.validation;
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    addFail(result, pathMessage("validation", "must be an object"));
  } else {
    if (!Array.isArray(validation.warnings)) {
      addFail(result, pathMessage("validation.warnings", "must be an array"));
    } else {
      for (const warning of validation.warnings) {
        addWarning(result, pathMessage("validation.warnings", String(warning)));
      }
    }
    if (!Array.isArray(validation.fails)) {
      addFail(result, pathMessage("validation.fails", "must be an array"));
    } else if (validation.fails.length > 0) {
      addFail(result, pathMessage("validation.fails", "must be empty before publication"));
    }
  }

  validateLifecycleDates(result, manifest, context);

  const budgets = validateBudgets({
    manifest,
    profile: options.profile ?? (manifest.isSignature ? "signature" : "simpleDish")
  });
  const shouldEnforceBudgetFails =
    manifest.status === "approved" || manifest.status === "published";
  result.warnings.push(...budgets.warnings);
  if (shouldEnforceBudgetFails) {
    result.fails.push(...budgets.fails);
  } else {
    for (const fail of budgets.fails) {
      addWarning(result, fail);
    }
  }
  result.evidence.push(...budgets.evidence);
  result.metrics.budgetChecks = budgets.metrics.budgetChecks;
  result.metrics.publicTotalBytes = budgets.metrics.publicTotalBytes;
  if (!budgets.ok && shouldEnforceBudgetFails) result.ok = false;

  result.evidence.push({
    restaurantSlug: manifest.restaurantSlug,
    menuSlug: manifest.menuSlug,
    dishSlug: manifest.dishSlug,
    activeVersion: manifest.activeVersion,
    status: manifest.status,
    context
  });

  return result;
}
