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
const DISH_SCHEMA_VERSIONS = new Set([1, 2]);
const RESTAURANT_SCHEMA_VERSIONS = new Set([1, 2]);
const STRICT_VISUAL_PROMISE =
  "visually indistinguishable under deterministic multi-angle mobile dining-distance review within strict thresholds";
const STRICT_VISUAL_VARIANTS = Object.freeze(["web", "mobile", "arLite"]);
const STRICT_VISUAL_ANGLE_MINIMUM = 4;
const STRICT_VISUAL_THRESHOLDS = Object.freeze({
  meanSsim: 0.985,
  perceptualScore: 0.98,
  maxDiffRatio: 0.004,
  maxSilhouetteDiff: 0.002,
  maxColorDelta: 0.015,
  maxTextureBlurDelta: 0.02,
  maxMaterialDrift: 0.02,
  maxScaleDriftMeters: 0.003,
  maxOriginDriftMeters: 0.003,
  maxLowPolyVisibility: 0.01,
  minAppetitePreservation: 0.98
});
const STRICT_VISUAL_REQUIRED_CHECKS = Object.freeze({
  textureSharpness: "texture sharpness must not regress",
  silhouette: "silhouette must not change",
  color: "color must not drift",
  material: "material must remain premium",
  scaleOrigin: "scale and origin must remain stable",
  lowPoly: "visible low-poly artifacts must be absent",
  appetite: "dish appetite appeal must be preserved"
});
const REAL_DEVICE_QA_TARGETS = Object.freeze(["iphoneQuickLook", "androidSceneViewer"]);

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

function isSchemaV2(manifest) {
  return manifest?.schemaVersion === 2;
}

function shouldUseStrictProductionSchema(manifest, context) {
  return (
    context === "production" &&
    (
      manifest.status === "approved" ||
      manifest.status === "published" ||
      manifest.validationStatus === "passed"
    )
  );
}

function shouldRequireStrictVisualIdentity(manifest, context) {
  return shouldUseStrictProductionSchema(manifest, context) && isSchemaV2(manifest);
}

function allowedRootsForContext(context) {
  if (context === "production") return ["/models/restaurants/"];
  if (context === "demo") return ["/models/demo/"];
  if (context === "demo-fixture") return ["/models/demo/", "/models/restaurants/"];
  return ["/models/restaurants/", "/models/demo/"];
}

function configuredCdnOrigins() {
  return String(process.env.VISTAIRE_3D_CDN_ORIGINS ?? "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);
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

function validatePublicUrl(result, url, path, context, allowedExternalOrigins = configuredCdnOrigins()) {
  if (typeof url !== "string" || !url.trim()) {
    addFail(result, pathMessage(path, "must be a stable public URL"));
    return;
  }

  if (/^https:\/\//i.test(url)) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      addFail(result, pathMessage(path, "must be a valid HTTPS URL"));
      return;
    }
    if (!allowedExternalOrigins.includes(parsed.origin)) {
      addFail(result, pathMessage(path, `external origin ${parsed.origin} is not allowlisted`));
    }
    if (parsed.search || parsed.hash || parsed.username || parsed.password) {
      addFail(result, pathMessage(path, "must not include credentials, query, or hash"));
    }
    if (parsed.pathname.includes("\\") || parsed.pathname.includes("..")) {
      addFail(result, pathMessage(path, "must not include traversal or backslashes"));
    }
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

function validateVariant(result, key, variant, context, allowedExternalOrigins) {
  const path = `variants.${key}`;
  if (!isObject(variant)) {
    addFail(result, pathMessage(path, "is required"));
    return;
  }

  validatePublicUrl(result, variant.url, `${path}.url`, context, allowedExternalOrigins);
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

  if (
    key === "arLite" &&
    Array.isArray(variant.extensionsRequired) &&
    variant.extensionsRequired.length > 0
  ) {
    addFail(result, pathMessage(`${path}.extensionsRequired`, "must be empty for Android AR-lite"));
  }
}

function variantDirectory(key) {
  return {
    web: "web",
    mobile: "mobile",
    arLite: "ar-lite",
    iosUsdz: "ios",
    poster: "poster"
  }[key] ?? key;
}

function validateExternalVariantPath(result, manifest, key, variant) {
  const url = String(variant?.url ?? "");
  if (!/^https:\/\//i.test(url)) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  const expected = `/${manifest.restaurantSlug}/${manifest.menuSlug}/${manifest.dishSlug}/${manifest.activeVersion}/${variantDirectory(key)}/`;
  let expectedPrefix = expected;
  const cdnBaseUrl = String(process.env.VISTAIRE_3D_CDN_BASE_URL ?? "").trim();
  if (cdnBaseUrl) {
    try {
      const base = new URL(cdnBaseUrl);
      if (base.origin === parsed.origin) {
        expectedPrefix = `${base.pathname.replace(/\/+$/, "")}${expected}`;
      }
    } catch {
      // The CLI layer reports invalid CDN base URLs; schema validation keeps the tenant path check deterministic.
    }
  }
  if (!parsed.pathname.startsWith(expectedPrefix)) {
    addFail(
      result,
      pathMessage(
        `variants.${key}.url`,
        `external URL path must start with ${expectedPrefix} to avoid cross-tenant CDN asset reuse`
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

function validateValidationBlock(result, manifest, context) {
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
  } else if (
    context === "production" &&
    manifest.status === "published" &&
    manifest.validation.fails.length > 0
  ) {
    addFail(result, pathMessage("validation.fails", "must be empty when production status is published"));
  }
}

function validateNumberField(
  result,
  value,
  path,
  { minExclusive = -Infinity, maxInclusive = Infinity } = {}
) {
  if (!Number.isFinite(value)) {
    addFail(result, pathMessage(path, "must be a finite number"));
    return;
  }
  if (value <= minExclusive || value > maxInclusive) {
    addFail(result, pathMessage(path, "is outside the allowed production range"));
  }
}

function numberAt(value, path) {
  const parts = path.split(".");
  let cursor = value;
  for (const part of parts) {
    if (!isObject(cursor) && typeof cursor !== "number") return undefined;
    cursor = cursor?.[part];
  }
  return Number.isFinite(cursor) ? cursor : undefined;
}

function visualMetric(visualQuality, metricName) {
  if (Number.isFinite(visualQuality?.[metricName])) return visualQuality[metricName];
  return numberAt(visualQuality, `metrics.${metricName}`);
}

function visualThreshold(visualQuality, thresholdName) {
  if (Number.isFinite(visualQuality?.thresholds?.[thresholdName])) {
    return visualQuality.thresholds[thresholdName];
  }
  return STRICT_VISUAL_THRESHOLDS[thresholdName];
}

function isEvidenceReference(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (!isObject(value)) return false;
  const reference = value.path ?? value.url ?? value.href;
  return typeof reference === "string" && reference.trim().length > 0;
}

function validateEvidenceTriplet(result, triplet, path) {
  if (!isObject(triplet)) {
    addFail(result, pathMessage(path, "must include before, after, and diff rendered evidence"));
    return;
  }
  for (const key of ["before", "after", "diff"]) {
    if (!isEvidenceReference(triplet[key])) {
      addFail(result, pathMessage(`${path}.${key}`, "rendered before/after/diff artifact is required"));
    }
  }
}

function validateMetricAtLeast(result, visualQuality, metricName, thresholdName, label) {
  const value = visualMetric(visualQuality, metricName);
  const threshold = visualThreshold(visualQuality, thresholdName);
  if (!Number.isFinite(value)) {
    addFail(result, pathMessage(`visualQuality.${metricName}`, `${label} metric is required`));
    return;
  }
  if (!Number.isFinite(threshold) || threshold < STRICT_VISUAL_THRESHOLDS[thresholdName]) {
    addFail(result, pathMessage(`visualQuality.thresholds.${thresholdName}`, "must keep the strict production minimum"));
  }
  if (value < STRICT_VISUAL_THRESHOLDS[thresholdName]) {
    addFail(
      result,
      pathMessage(
        `visualQuality.${metricName}`,
        `${label} ${value} is below strict threshold ${STRICT_VISUAL_THRESHOLDS[thresholdName]}`
      )
    );
  }
}

function validateMetricAtMost(result, visualQuality, metricName, thresholdName, label) {
  const value = visualMetric(visualQuality, metricName);
  const threshold = visualThreshold(visualQuality, thresholdName);
  if (!Number.isFinite(value)) {
    addFail(result, pathMessage(`visualQuality.${metricName}`, `${label} metric is required`));
    return;
  }
  if (!Number.isFinite(threshold) || threshold > STRICT_VISUAL_THRESHOLDS[thresholdName]) {
    addFail(result, pathMessage(`visualQuality.thresholds.${thresholdName}`, "must keep the strict production maximum"));
  }
  if (value > STRICT_VISUAL_THRESHOLDS[thresholdName]) {
    addFail(
      result,
      pathMessage(
        `visualQuality.${metricName}`,
        `${label} ${value} exceeds strict threshold ${STRICT_VISUAL_THRESHOLDS[thresholdName]}`
      )
    );
  }
}

function validateRealDeviceQa(result, qa, path) {
  if (!isObject(qa)) {
    addFail(result, pathMessage(path, "real-device QA evidence is required"));
    return;
  }
  if (qa.required !== true) {
    addFail(result, pathMessage(`${path}.required`, "must be true for production 3D/AR publish"));
  }
  for (const target of REAL_DEVICE_QA_TARGETS) {
    const entry = qa[target];
    const entryPath = `${path}.${target}`;
    if (!isObject(entry)) {
      addFail(result, pathMessage(entryPath, "real-device QA result is required"));
      continue;
    }
    if (entry.required !== true) {
      addFail(result, pathMessage(`${entryPath}.required`, "must be true"));
    }
    if (entry.status !== "passed") {
      addFail(result, pathMessage(`${entryPath}.status`, "must be passed on a real device before publishing"));
    }
    for (const field of ["device", "os", "testedBy"]) {
      if (typeof entry[field] !== "string" || !entry[field].trim()) {
        addFail(result, pathMessage(`${entryPath}.${field}`, "is required for real-device QA"));
      }
    }
    if (!isIsoDateOrNull(entry.testedAt) || entry.testedAt === null) {
      addFail(result, pathMessage(`${entryPath}.testedAt`, "real-device QA date is required"));
    }
    if (!isObject(entry.evidence)) {
      addFail(result, pathMessage(`${entryPath}.evidence`, "uploaded evidence metadata is required"));
    } else {
      if (!isEvidenceReference(entry.evidence)) {
        addFail(result, pathMessage(`${entryPath}.evidence`, "must include a local or private evidence reference"));
      }
      if (typeof entry.evidence.sha256 !== "string" || !SHA256_PATTERN.test(entry.evidence.sha256)) {
        addFail(result, pathMessage(`${entryPath}.evidence.sha256`, "must be a sha256 hex digest"));
      }
      if (!Number.isFinite(entry.evidence.bytes) || entry.evidence.bytes <= 0) {
        addFail(result, pathMessage(`${entryPath}.evidence.bytes`, "must be a positive byte size"));
      }
    }
  }
}

function angleReportsForVariant(visualQuality, variantKey) {
  const reports = Array.isArray(visualQuality?.angleReports) ? visualQuality.angleReports : [];
  return reports.filter((entry) => entry?.variant === variantKey || isObject(entry?.variants?.[variantKey]));
}

function validateStrictVisualIdentity(result, manifest) {
  const visualQuality = manifest.visualQuality;
  if (!isObject(visualQuality)) {
    addFail(result, pathMessage("visualQuality", "must be an object"));
    return;
  }

  if (visualQuality.status !== "passed") {
    addFail(result, pathMessage("visualQuality.status", "must be passed after strict rendered visual identity review"));
  }
  if (visualQuality.promise !== STRICT_VISUAL_PROMISE) {
    addFail(
      result,
      pathMessage(
        "visualQuality.promise",
        `must be ${JSON.stringify(STRICT_VISUAL_PROMISE)}`
      )
    );
  }
  const method = String(visualQuality.method ?? "");
  if (!/render/i.test(method) || !/comparison/i.test(method)) {
    addFail(result, pathMessage("visualQuality.method", "must describe deterministic rendered comparison"));
  }
  if (/proxy|structural/i.test(method)) {
    addFail(result, pathMessage("visualQuality.method", "structural visualQuality proxy is not production evidence"));
  }
  if (!isEvidenceReference(visualQuality.report)) {
    addFail(result, pathMessage("visualQuality.report", "visual report is required"));
  }

  const artifacts = visualQuality.reportArtifacts;
  if (!isObject(artifacts)) {
    addFail(result, pathMessage("visualQuality.reportArtifacts", "rendered before/after/diff evidence is required"));
  } else {
    for (const variantKey of STRICT_VISUAL_VARIANTS) {
      validateEvidenceTriplet(result, artifacts[variantKey], `visualQuality.reportArtifacts.${variantKey}`);
    }
  }

  const angleReports = Array.isArray(visualQuality.angleReports) ? visualQuality.angleReports : [];
  if (angleReports.length === 0) {
    addFail(result, pathMessage("visualQuality.angleReports", "report per angle is required"));
  }
  for (const variantKey of STRICT_VISUAL_VARIANTS) {
    const variantReports = angleReportsForVariant(visualQuality, variantKey);
    const angles = new Set(variantReports.map((entry) => entry.angle).filter(Boolean));
    if (angles.size < STRICT_VISUAL_ANGLE_MINIMUM) {
      addFail(
        result,
        pathMessage(
          `visualQuality.angleReports.${variantKey}`,
          `must include at least ${STRICT_VISUAL_ANGLE_MINIMUM} deterministic angles`
        )
      );
    }
    for (const report of variantReports) {
      const reportPath = `visualQuality.angleReports.${variantKey}.${report.angle ?? "unknown"}`;
      validateEvidenceTriplet(result, report, reportPath);
      if (report.status !== "passed") {
        addFail(result, pathMessage(`${reportPath}.status`, "must be passed"));
      }
      if (!Number.isFinite(report.ssim)) {
        addFail(result, pathMessage(`${reportPath}.ssim`, "SSIM metric is required"));
      } else if (report.ssim < STRICT_VISUAL_THRESHOLDS.meanSsim) {
        addFail(result, pathMessage(`${reportPath}.ssim`, "is below the strict SSIM threshold"));
      }
      if (!Number.isFinite(report.perceptualScore)) {
        addFail(result, pathMessage(`${reportPath}.perceptualScore`, "perceptual metric is required"));
      } else if (report.perceptualScore < STRICT_VISUAL_THRESHOLDS.perceptualScore) {
        addFail(result, pathMessage(`${reportPath}.perceptualScore`, "is below the strict perceptual threshold"));
      }
      if (!Number.isFinite(report.maxDiffRatio)) {
        addFail(result, pathMessage(`${reportPath}.maxDiffRatio`, "diff ratio metric is required"));
      } else if (report.maxDiffRatio > STRICT_VISUAL_THRESHOLDS.maxDiffRatio) {
        addFail(result, pathMessage(`${reportPath}.maxDiffRatio`, "exceeds the strict diff threshold"));
      }
    }
  }

  validateMetricAtLeast(result, visualQuality, "meanSsim", "meanSsim", "SSIM");
  validateMetricAtLeast(result, visualQuality, "perceptualScore", "perceptualScore", "perceptual score");
  validateMetricAtMost(result, visualQuality, "maxDiffRatio", "maxDiffRatio", "pixel diff ratio");
  validateMetricAtMost(result, visualQuality, "maxSilhouetteDiff", "maxSilhouetteDiff", "silhouette diff");
  validateMetricAtMost(result, visualQuality, "maxColorDelta", "maxColorDelta", "color drift");
  validateMetricAtMost(result, visualQuality, "maxTextureBlurDelta", "maxTextureBlurDelta", "texture blur");
  validateMetricAtMost(result, visualQuality, "maxMaterialDrift", "maxMaterialDrift", "material drift");
  validateMetricAtMost(result, visualQuality, "maxScaleDriftMeters", "maxScaleDriftMeters", "scale drift");
  validateMetricAtMost(result, visualQuality, "maxOriginDriftMeters", "maxOriginDriftMeters", "origin drift");
  validateMetricAtMost(result, visualQuality, "lowPolyVisibilityScore", "maxLowPolyVisibility", "visible low-poly score");
  validateMetricAtLeast(
    result,
    visualQuality,
    "appetitePreservationScore",
    "minAppetitePreservation",
    "appetite preservation"
  );

  if (!isObject(visualQuality.checks)) {
    addFail(result, pathMessage("visualQuality.checks", "strict visual checks are required"));
  } else {
    for (const [checkKey, message] of Object.entries(STRICT_VISUAL_REQUIRED_CHECKS)) {
      const check = visualQuality.checks[checkKey];
      if (!isObject(check)) {
        addFail(result, pathMessage(`visualQuality.checks.${checkKey}`, message));
      } else if (check.status !== "passed") {
        addFail(result, pathMessage(`visualQuality.checks.${checkKey}.status`, message));
      }
    }
  }

  const manualReview = visualQuality.manualReview;
  if (!isObject(manualReview) || manualReview.required !== true) {
    addFail(result, pathMessage("visualQuality.manualReview.required", "human visual approval is required"));
  } else {
    if (manualReview.status !== "approved") {
      addFail(result, pathMessage("visualQuality.manualReview.status", "must be approved by a human reviewer"));
    }
    if (manualReview.approvalType !== "human") {
      addFail(result, pathMessage("visualQuality.manualReview.approvalType", "must be human"));
    }
    if (typeof manualReview.approvedBy !== "string" || !manualReview.approvedBy.trim()) {
      addFail(result, pathMessage("visualQuality.manualReview.approvedBy", "human reviewer name is required"));
    }
    if (!isIsoDateOrNull(manualReview.approvedAt) || manualReview.approvedAt === null) {
      addFail(result, pathMessage("visualQuality.manualReview.approvedAt", "human approval date is required"));
    }
  }

  if (!isObject(manifest.quality)) {
    addFail(result, pathMessage("quality", "manual visual approval block is required"));
  } else {
    if (manifest.quality.manualVisualApprovalRequired !== true) {
      addFail(result, pathMessage("quality.manualVisualApprovalRequired", "must remain true for production"));
    }
    if (manifest.quality.manualVisualApproved !== true) {
      addFail(result, pathMessage("quality.manualVisualApproved", "human visual approval is required"));
    }
    if (typeof manifest.quality.approvedBy !== "string" || !manifest.quality.approvedBy.trim()) {
      addFail(result, pathMessage("quality.approvedBy", "human reviewer name is required"));
    }
    validateRealDeviceQa(result, manifest.quality.realDeviceQa, "quality.realDeviceQa");
  }
  validateRealDeviceQa(result, visualQuality.realDeviceQa, "visualQuality.realDeviceQa");
}

function validateStrictProductionVariantMetadata(result, manifest) {
  const arLite = manifest.variants?.arLite;
  const iosUsdz = manifest.variants?.iosUsdz;
  const poster = manifest.variants?.poster;
  const sourceSha256 = manifest.sourceAnalysis?.sha256;

  if (isObject(arLite)) {
    if (arLite.optimizationMethod === "copy" || arLite.optimizer?.command?.includes(" copy ")) {
      addFail(result, pathMessage("variants.arLite.optimizationMethod", "arLite copy cannot be presented as optimization"));
    }
    if (typeof sourceSha256 === "string" && arLite.sha256 === sourceSha256) {
      addFail(result, pathMessage("variants.arLite.sha256", "arLite must not be an unoptimized source copy"));
    }
    if (arLite.sha256 && arLite.sha256 === manifest.variants?.web?.sha256) {
      addFail(result, pathMessage("variants.arLite.sha256", "arLite must not be a web GLB copy"));
    }
    if (arLite.sha256 && arLite.sha256 === manifest.variants?.mobile?.sha256) {
      addFail(result, pathMessage("variants.arLite.sha256", "arLite must not be a mobile GLB copy"));
    }
  }

  if (isObject(iosUsdz)) {
    if (iosUsdz.productionFaithful !== true) {
      addFail(result, pathMessage("variants.iosUsdz.productionFaithful", "faithful USDZ export is required for production"));
    }
    if (iosUsdz.proxy === true) {
      addFail(result, pathMessage("variants.iosUsdz.proxy", "USDZ proxy packages cannot be production assets"));
    }
  }

  if (isObject(poster)) {
    if (poster.placeholder === true) {
      addFail(result, pathMessage("variants.poster.placeholder", "poster placeholder cannot be production evidence"));
    }
    if (poster.productionPoster !== true) {
      addFail(result, pathMessage("variants.poster.productionPoster", "production poster approval is required"));
    }
  }
}

function validateVec3(result, value, path) {
  if (!Array.isArray(value) || value.length !== 3) {
    addFail(result, pathMessage(path, "must be a 3-number array"));
    return;
  }
  value.forEach((number, index) => {
    validateNumberField(result, number, `${path}[${index}]`);
  });
}

function validateV2Blocks(result, manifest, context) {
  if (manifest.kind !== "vistaire.dish-3d-manifest") {
    addFail(result, pathMessage("kind", "must be vistaire.dish-3d-manifest"));
  }

  if (!isObject(manifest.physicalScaleMeters)) {
    addFail(result, pathMessage("physicalScaleMeters", "must be an object"));
  } else {
    validateNumberField(result, manifest.physicalScaleMeters.width, "physicalScaleMeters.width", {
      minExclusive: 0,
      maxInclusive: 3
    });
    validateNumberField(result, manifest.physicalScaleMeters.height, "physicalScaleMeters.height", {
      minExclusive: 0,
      maxInclusive: 2
    });
    validateNumberField(result, manifest.physicalScaleMeters.depth, "physicalScaleMeters.depth", {
      minExclusive: 0,
      maxInclusive: 3
    });
  }

  if (!isObject(manifest.bounds)) {
    addFail(result, pathMessage("bounds", "must be an object"));
  } else {
    if (manifest.bounds.centeredXZ !== true) {
      addFail(result, pathMessage("bounds.centeredXZ", "must be true for production AR"));
    }
    if (manifest.bounds.groundedY !== true) {
      addFail(result, pathMessage("bounds.groundedY", "must be true for production AR"));
    }
    validateVec3(result, manifest.bounds.min, "bounds.min");
    validateVec3(result, manifest.bounds.max, "bounds.max");
  }

  if (!isObject(manifest.budgets)) {
    addFail(result, pathMessage("budgets", "must be an object"));
  } else if (
    manifest.budgets.profile &&
    !["simpleDish", "signature"].includes(manifest.budgets.profile)
  ) {
    addFail(result, pathMessage("budgets.profile", "must be simpleDish or signature"));
  }

  if (!isObject(manifest.quality)) {
    addFail(result, pathMessage("quality", "must be an object"));
  } else if (
    manifest.status === "published" &&
    manifest.quality.manualVisualApprovalRequired !== false &&
    manifest.quality.manualVisualApproved !== true
  ) {
    addFail(result, "quality.manualVisualApproved: is required before publishing production assets");
  }

  if (!isObject(manifest.sourceAnalysis)) {
    addFail(result, pathMessage("sourceAnalysis", "must be an object"));
  } else {
    validateNumberField(result, manifest.sourceAnalysis.bytes, "sourceAnalysis.bytes", {
      minExclusive: 0
    });
    if (
      typeof manifest.sourceAnalysis.sha256 !== "string" ||
      !SHA256_PATTERN.test(manifest.sourceAnalysis.sha256)
    ) {
      addFail(result, pathMessage("sourceAnalysis.sha256", "must be a sha256 hex digest"));
    }
    for (const field of ["meshes", "primitives", "triangles", "vertices", "materials", "textures", "images"]) {
      validateNumberField(result, manifest.sourceAnalysis[field], `sourceAnalysis.${field}`, {
        minExclusive: -1
      });
    }
    if (!Array.isArray(manifest.sourceAnalysis.externalUris)) {
      addFail(result, pathMessage("sourceAnalysis.externalUris", "must be an array"));
    } else if (manifest.sourceAnalysis.externalUris.length > 0) {
      addFail(result, pathMessage("sourceAnalysis.externalUris", "must be empty for production GLB assets"));
    }
  }

  if (!isObject(manifest.visualQuality)) {
    addFail(result, pathMessage("visualQuality", "must be an object"));
  } else {
    if (!["passed", "warning", "failed", "unvalidated"].includes(manifest.visualQuality.status)) {
      addFail(result, pathMessage("visualQuality.status", "must be passed, warning, failed, or unvalidated"));
    }
    if ("score" in manifest.visualQuality) {
      validateNumberField(result, manifest.visualQuality.score, "visualQuality.score", {
        minExclusive: -0.000001,
        maxInclusive: 1
      });
    }
    if (manifest.status === "published" && manifest.visualQuality.status !== "passed") {
      addFail(result, pathMessage("visualQuality.status", "must be passed when production status is published"));
    }
  }

  if (shouldRequireStrictVisualIdentity(manifest, context)) {
    validateStrictVisualIdentity(result, manifest);
    validateStrictProductionVariantMetadata(result, manifest);
  }

  if (!isObject(manifest.lifecycle)) {
    addFail(result, pathMessage("lifecycle", "must be an object"));
  } else if (manifest.lifecycle.phase && manifest.lifecycle.phase !== manifest.status) {
    addFail(result, pathMessage("lifecycle.phase", "must match manifest status"));
  }

  if (!isObject(manifest.rollback)) {
    addFail(result, pathMessage("rollback", "must be an object"));
  } else {
    for (const field of ["previousVersion", "fromVersion", "toVersion"]) {
      const value = manifest.rollback[field];
      if (!(value === null || typeof value === "string")) {
        addFail(result, pathMessage(`rollback.${field}`, "must be a string or null"));
      }
    }
  }
}

function expectedValidationStatusFor(manifest) {
  if (manifest.validation?.fails?.length > 0) return "failed";
  if (manifest.validation?.warnings?.length > 0) return "warning";
  if (manifest.validationStatus === "unvalidated") return "unvalidated";
  return "passed";
}

export function validateDishManifestSchema(manifest, options = {}) {
  const context = options.context ?? "production";
  const allowedExternalOrigins = options.allowedExternalOrigins ?? configuredCdnOrigins();
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
    "validation",
    "generatedAt",
    "approvedAt",
    "publishedAt"
  ]) {
    if (!(field in manifest)) addFail(result, pathMessage(field, "is required"));
  }

  if (!DISH_SCHEMA_VERSIONS.has(manifest.schemaVersion)) {
    addFail(result, pathMessage("schemaVersion", "must be 1 or 2"));
  } else if (shouldUseStrictProductionSchema(manifest, context) && !isSchemaV2(manifest)) {
    addFail(
      result,
      pathMessage(
        "schemaVersion",
        "must be 2 for production manifests marked passed, approved, or published"
      )
    );
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
      validateVariant(result, key, manifest.variants[key], context, allowedExternalOrigins);
      validateExternalVariantPath(result, manifest, key, manifest.variants[key]);
    }
  }

  if (!isSchemaV2(manifest) && !isObject(manifest.bytes)) {
    addFail(result, pathMessage("bytes", "must be an object"));
  } else if (
    isObject(manifest.bytes) &&
    "total" in manifest.bytes &&
    (!Number.isFinite(manifest.bytes.total) || manifest.bytes.total <= 0)
  ) {
    addFail(result, pathMessage("bytes.total", "must be a positive byte size"));
  }

  validateValidationBlock(result, manifest, context);
  validateLifecycleDates(result, manifest, context);
  if (isSchemaV2(manifest)) validateV2Blocks(result, manifest, context);

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
    profile:
      options.profile ??
      manifest.budgets?.profile ??
      manifest.budgetProfile ??
      (manifest.isSignature ? "signature" : "simpleDish")
  });
  if (!budgets.ok) result.ok = false;
  result.warnings.push(...budgets.warnings);
  result.fails.push(...budgets.fails);
  result.evidence.push(...budgets.evidence);
  result.metrics.budgetChecks = budgets.metrics.budgetChecks;
  result.metrics.publicTotalBytes = budgets.metrics.publicTotalBytes;
  result.metrics.validationStatus = result.fails.length > 0 ? "failed" : expectedQualityStatus;

  if (isObject(manifest.bytes) && Number.isFinite(manifest.bytes.total)) {
    if (manifest.bytes.total !== budgets.metrics.publicTotalBytes) {
      addFail(
        result,
        pathMessage(
          "bytes.total",
          `must equal unique public variant bytes (${budgets.metrics.publicTotalBytes})`
        )
      );
      result.metrics.validationStatus = "failed";
    }
  }

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
  if (!RESTAURANT_SCHEMA_VERSIONS.has(manifest.schemaVersion)) {
    addFail(result, pathMessage("schemaVersion", "must be 1 or 2"));
  }
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
