import { validateBudgets } from "./budget-checks.mjs";
import { addFail, addWarning, createValidationResult } from "./file-exists.mjs";

export const ALLOWED_STATUSES = Object.freeze([
  "draft",
  "review",
  "approved",
  "published",
  "archived"
]);

export const ALLOWED_VALIDATION_STATUSES = Object.freeze([
  "unvalidated",
  "passed",
  "warning",
  "failed"
]);

export const REQUIRED_VARIANTS = Object.freeze([
  "web",
  "mobile",
  "arLite",
  "iosUsdz",
  "poster"
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function pathMessage(path, message) {
  return `${path}: ${message}`;
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function validateSlug(result, value, path) {
  if (typeof value !== "string" || !value.trim()) {
    addFail(result, pathMessage(path, "is required and must be a non-empty string"));
    return;
  }
  if (!SLUG_PATTERN.test(value)) {
    addFail(result, pathMessage(path, "must be a lowercase slug"));
  }
}

function validatePublicUrl(result, url, path, context) {
  if (typeof url !== "string" || !url.trim()) {
    addFail(result, pathMessage(path, "must be a stable public URL"));
    return;
  }

  if (
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.includes("\\") ||
    url.includes("..") ||
    /[?#]/.test(url) ||
    /^(?:javascript|data|file|https?):/i.test(url)
  ) {
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
  if (key === "poster" && !/\.(?:png|jpe?g|webp|avif|svg)$/i.test(lower)) {
    addFail(result, pathMessage(path, "must point to a poster image"));
  }
}

function validateVariant(result, key, variant, context) {
  const path = `variants.${key}`;
  if (!isObject(variant)) {
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

  if (typeof variant.sha256 !== "string" || !SHA256_PATTERN.test(variant.sha256)) {
    addFail(result, pathMessage(`${path}.sha256`, "must be a sha256 hex digest"));
  }

  if (
    "validationStatus" in variant &&
    !ALLOWED_VALIDATION_STATUSES.includes(variant.validationStatus)
  ) {
    addFail(
      result,
      pathMessage(
        `${path}.validationStatus`,
        `must be one of ${ALLOWED_VALIDATION_STATUSES.join(", ")}`
      )
    );
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
    if (manifest.validationStatus !== "passed") {
      addFail(result, "validationStatus: must be passed when production status is published");
    }
  }
}

function validateValidationBlock(result, manifest) {
  if (!isObject(manifest.validation)) {
    addFail(result, pathMessage("validation", "must be an object"));
    return;
  }
  if (!Array.isArray(manifest.validation.warnings)) {
    addFail(result, pathMessage("validation.warnings", "must be an array"));
  } else {
    for (const warning of manifest.validation.warnings) {
      addWarning(result, pathMessage("validation.warnings", String(warning)));
    }
  }
  if (!Array.isArray(manifest.validation.fails)) {
    addFail(result, pathMessage("validation.fails", "must be an array"));
  } else if (manifest.validation.fails.length > 0) {
    addFail(result, pathMessage("validation.fails", "must be empty before publication"));
  }
}

function deriveValidationStatus(result) {
  if (result.fails.length > 0) return "failed";
  if (result.warnings.length > 0) return "warning";
  return "passed";
}

function expectedValidationStatusFor(manifest) {
  if (manifest.validation?.fails?.length > 0) return "failed";
  if (manifest.validation?.warnings?.length > 0) return "warning";
  return "passed";
}

export function validateDishManifestSchema(manifest, options = {}) {
  const context = options.context ?? "production";
  const result = createValidationResult({
    name: "manifest-schema",
    metrics: {
      context,
      validationStatus: "unvalidated",
      budgetChecks: []
    }
  });

  if (!isObject(manifest)) {
    return addFail(result, "manifest: must be an object");
  }

  for (const field of [
    "schemaVersion",
    "restaurantSlug",
    "menuSlug",
    "dishSlug",
    "activeVersion",
    "status",
    "validationStatus",
    "variants",
    "bytes",
    "validation",
    "generatedAt",
    "approvedAt",
    "publishedAt"
  ]) {
    if (!(field in manifest)) addFail(result, pathMessage(field, "is required"));
  }

  if (manifest.schemaVersion !== 1) {
    addFail(result, pathMessage("schemaVersion", "must be 1"));
  }
  for (const field of ["restaurantSlug", "menuSlug", "dishSlug"]) {
    validateSlug(result, manifest[field], field);
  }
  if (typeof manifest.activeVersion !== "string" || !manifest.activeVersion.trim()) {
    addFail(result, pathMessage("activeVersion", "must be a non-empty string"));
  }

  if (!ALLOWED_STATUSES.includes(manifest.status)) {
    addFail(result, pathMessage("status", `must be one of ${ALLOWED_STATUSES.join(", ")}`));
  }
  if (!ALLOWED_VALIDATION_STATUSES.includes(manifest.validationStatus)) {
    addFail(
      result,
      pathMessage(
        "validationStatus",
        `must be one of ${ALLOWED_VALIDATION_STATUSES.join(", ")}`
      )
    );
  }

  if (!isObject(manifest.variants)) {
    addFail(result, pathMessage("variants", "must be an object"));
  } else {
    for (const key of REQUIRED_VARIANTS) {
      validateVariant(result, key, manifest.variants[key], context);
    }
  }

  if (!isObject(manifest.bytes)) {
    addFail(result, pathMessage("bytes", "must be an object"));
  } else if ("total" in manifest.bytes && (!Number.isFinite(manifest.bytes.total) || manifest.bytes.total <= 0)) {
    addFail(result, pathMessage("bytes.total", "must be a positive byte size"));
  }

  validateValidationBlock(result, manifest);
  validateLifecycleDates(result, manifest, context);

  const declaredQualityStatus = manifest.validationStatus;
  const expectedQualityStatus = expectedValidationStatusFor(manifest);
  if (
    ALLOWED_VALIDATION_STATUSES.includes(declaredQualityStatus) &&
    declaredQualityStatus !== expectedQualityStatus
  ) {
    addFail(
      result,
      pathMessage(
        "validationStatus",
        `declared ${declaredQualityStatus} does not match current ${expectedQualityStatus}`
      )
    );
  }
  if (manifest.status === "published" && manifest.validation?.warnings?.length > 0) {
    addFail(result, "published manifests must not carry validation warnings");
  }

  const budgets = validateBudgets({
    manifest,
    profile: options.profile ?? manifest.budgetProfile ?? (manifest.isSignature ? "signature" : "simpleDish")
  });
  if (!budgets.ok) result.ok = false;
  result.warnings.push(...budgets.warnings);
  result.fails.push(...budgets.fails);
  result.evidence.push(...budgets.evidence);
  result.metrics.budgetChecks = budgets.metrics.budgetChecks;
  result.metrics.publicTotalBytes = budgets.metrics.publicTotalBytes;
  result.metrics.validationStatus = deriveValidationStatus(result);

  result.evidence.push({
    restaurantSlug: manifest.restaurantSlug,
    menuSlug: manifest.menuSlug,
    dishSlug: manifest.dishSlug,
    activeVersion: manifest.activeVersion,
    status: manifest.status,
    validationStatus: manifest.validationStatus,
    context
  });

  return result;
}

export function validateRestaurantManifestSchema(manifest) {
  const result = createValidationResult({
    name: "restaurant-manifest-schema",
    metrics: {
      validationStatus: manifest?.validationStatus ?? "unvalidated"
    }
  });

  if (!isObject(manifest)) return addFail(result, "manifest: must be an object");
  for (const field of ["schemaVersion", "restaurantSlug", "menus", "dishes", "activeVersions", "generatedAt", "validationStatus"]) {
    if (!(field in manifest)) addFail(result, pathMessage(field, "is required"));
  }
  if (manifest.schemaVersion !== 1) addFail(result, pathMessage("schemaVersion", "must be 1"));
  validateSlug(result, manifest.restaurantSlug, "restaurantSlug");
  if (!Array.isArray(manifest.menus)) addFail(result, pathMessage("menus", "must be an array"));
  else {
    for (const [index, menu] of manifest.menus.entries()) {
      if (!isObject(menu)) {
        addFail(result, pathMessage(`menus[${index}]`, "must be an object"));
        continue;
      }
      validateSlug(result, menu.menuSlug, `menus[${index}].menuSlug`);
      if (!isObject(menu.activeVersions)) {
        addFail(result, pathMessage(`menus[${index}].activeVersions`, "must be an object"));
      }
      if (!Array.isArray(menu.dishes)) {
        addFail(result, pathMessage(`menus[${index}].dishes`, "must be an array"));
      } else {
        for (const [dishIndex, dishSlug] of menu.dishes.entries()) {
          validateSlug(result, dishSlug, `menus[${index}].dishes[${dishIndex}]`);
        }
      }
    }
  }
  if (!Array.isArray(manifest.dishes)) addFail(result, pathMessage("dishes", "must be an array"));
  else {
    for (const [index, dish] of manifest.dishes.entries()) {
      if (!isObject(dish)) {
        addFail(result, pathMessage(`dishes[${index}]`, "must be an object"));
        continue;
      }
      validateSlug(result, dish.menuSlug, `dishes[${index}].menuSlug`);
      validateSlug(result, dish.dishSlug, `dishes[${index}].dishSlug`);
      if (typeof dish.activeVersion !== "string" || !dish.activeVersion.trim()) {
        addFail(result, pathMessage(`dishes[${index}].activeVersion`, "must be a non-empty string"));
      }
      if (!ALLOWED_STATUSES.includes(dish.status)) {
        addFail(result, pathMessage(`dishes[${index}].status`, `must be one of ${ALLOWED_STATUSES.join(", ")}`));
      }
      if (!ALLOWED_VALIDATION_STATUSES.includes(dish.validationStatus)) {
        addFail(
          result,
          pathMessage(
            `dishes[${index}].validationStatus`,
            `must be one of ${ALLOWED_VALIDATION_STATUSES.join(", ")}`
          )
        );
      }
    }
  }
  if (!isObject(manifest.activeVersions)) addFail(result, pathMessage("activeVersions", "must be an object"));
  else if (Array.isArray(manifest.dishes)) {
    for (const dish of manifest.dishes.filter(isObject)) {
      const key = `${dish.menuSlug}/${dish.dishSlug}`;
      if (manifest.activeVersions[key] !== dish.activeVersion) {
        addFail(result, pathMessage("activeVersions", `must map ${key} to ${dish.activeVersion}`));
      }
    }
  }
  if (!isIsoDateOrNull(manifest.generatedAt) || manifest.generatedAt === null) {
    addFail(result, pathMessage("generatedAt", "must be an ISO UTC date string"));
  }
  if (!ALLOWED_VALIDATION_STATUSES.includes(manifest.validationStatus)) {
    addFail(
      result,
      pathMessage(
        "validationStatus",
        `must be one of ${ALLOWED_VALIDATION_STATUSES.join(", ")}`
      )
    );
  }

  return result;
}
