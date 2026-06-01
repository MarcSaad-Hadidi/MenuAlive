import { createHash } from "node:crypto";

export type VisualReviewIdentity = {
  restaurantSlug: string;
  menuSlug: string;
  dishSlug: string;
  version: string;
};

export type VisualReviewImage = {
  label: "before" | "after" | "diff";
  path: string;
  url: string;
};

export type VisualReviewAngle = {
  id: string;
  variant: string;
  angle: string;
  status: string;
  before: VisualReviewImage | null;
  after: VisualReviewImage | null;
  diff: VisualReviewImage | null;
  metrics: VisualReviewMetric[];
};

export type VisualReviewMetric = {
  label: string;
  value: string;
  status: "passed" | "warning" | "failed" | "missing";
};

export type VisualReviewModelDescriptor = {
  label: string;
  url: string;
  origin: "owner-artifact" | "public-runtime" | "cdn";
  artifactPath?: string;
  bytes?: number | null;
  sha256?: string | null;
};

export type VisualReviewState = {
  identity: VisualReviewIdentity;
  hasVisualReport: boolean;
  visualReportValid: boolean;
  visualReportSha256: string | null;
  warning: string;
  sourceModel: VisualReviewModelDescriptor | null;
  candidateModel: VisualReviewModelDescriptor | null;
  selectedCandidate: string;
  selectedCandidateReason: string;
  rejectedCandidates: Array<{
    name: string;
    reasons: string[];
  }>;
  angles: VisualReviewAngle[];
  summaryMetrics: VisualReviewMetric[];
  approval: {
    canApprove: boolean;
    disabledReason: string;
  };
};

export type ReviewActionInput =
  | { action: "approve"; reviewerName?: string | null }
  | { action: "reject"; note?: string | null };

type JsonObject = Record<string, unknown>;
type ReviewModelUrlOptions = {
  allowedOrigins?: string[];
  identity?: VisualReviewIdentity;
  cdnBaseUrl?: string;
};

const IMAGE_EXTENSIONS = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

const GLB_EXTENSION = ".glb";
const IDENTITY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4
});

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function objectValue(value: unknown): JsonObject | null {
  return isObject(value) ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanRelativePath(value: string): string | null {
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\u0000") ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    return null;
  }
  return normalized;
}

function extensionOf(path: string): string {
  const match = path.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function cdnIdentityPrefixes(identity: VisualReviewIdentity, cdnBaseUrl?: string): string[] {
  const identityPrefix = `/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}/`;
  const prefixes = [identityPrefix];
  const rawBase = cdnBaseUrl?.trim();
  if (rawBase) {
    try {
      const parsed = new URL(rawBase);
      const basePath = parsed.pathname.replace(/\/+$/, "");
      prefixes.unshift(`${basePath}${identityPrefix}`);
    } catch {
      // Ignore malformed optional base URLs; origin allowlisting still applies.
    }
  }
  return prefixes;
}

function cdnPathMatchesIdentity(
  pathname: string,
  identity: VisualReviewIdentity,
  cdnBaseUrl?: string
): boolean {
  return cdnIdentityPrefixes(identity, cdnBaseUrl).some((prefix) =>
    pathname.startsWith(prefix)
  );
}

function isSafeIdentity(identity: VisualReviewIdentity): boolean {
  return Object.values(identity).every(
    (value) =>
      IDENTITY_PATTERN.test(value) &&
      value === value.trim() &&
      value === value.toLowerCase() &&
      !value.includes("..")
  );
}

function artifactUrl(path: string, identity: VisualReviewIdentity): string {
  const params = new URLSearchParams({
    restaurantSlug: identity.restaurantSlug,
    menuSlug: identity.menuSlug,
    dishSlug: identity.dishSlug,
    version: identity.version,
    path
  });
  return `/api/owner/3d-ar/review-artifact?${params.toString()}`;
}

function metricStatus(value: number | null, direction: "min" | "max", threshold: number): VisualReviewMetric["status"] {
  if (value === null) return "missing";
  if (direction === "min") return value >= threshold ? "passed" : "failed";
  return value <= threshold ? "passed" : "failed";
}

function metric(label: string, value: unknown, direction: "min" | "max", threshold: number): VisualReviewMetric {
  const numeric = numberValue(value);
  return {
    label,
    value: numeric === null ? "Missing" : NUMBER_FORMAT.format(numeric),
    status: metricStatus(numeric, direction, threshold)
  };
}

function imageFromPath(
  label: VisualReviewImage["label"],
  value: unknown,
  identity: VisualReviewIdentity
): VisualReviewImage | null {
  const raw = stringValue(value);
  if (!raw) return null;
  const validation = validateReviewArtifactPath(raw);
  if (!validation.ok || validation.kind !== "review-image") return null;
  return {
    label,
    path: validation.relativePath,
    url: artifactUrl(validation.relativePath, identity)
  };
}

function modelFromArtifact(
  label: string,
  value: unknown,
  identity: VisualReviewIdentity
): VisualReviewModelDescriptor | null {
  const raw = stringValue(value);
  if (!raw) return null;

  const safeUrl = sanitizeReviewModelUrl(raw, {
    allowedOrigins: parseAllowedOrigins(process.env.VISTAIRE_3D_CDN_ORIGINS),
    identity
  });
  if (safeUrl.ok) {
    return {
      label,
      url: safeUrl.url,
      origin: safeUrl.origin
    };
  }

  const validation = validateReviewArtifactPath(raw);
  if (!validation.ok || validation.kind !== "model-glb") return null;
  return {
    label,
    url: artifactUrl(validation.relativePath, identity),
    origin: "owner-artifact",
    artifactPath: validation.relativePath
  };
}

function objectArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function reasonsFromCandidate(candidate: JsonObject): string[] {
  const explicitReasons = objectArray(candidate.reasons)
    .map((reason) => stringValue(reason.reason || reason.message))
    .filter(Boolean);
  const reason = stringValue(candidate.reason);
  return explicitReasons.length > 0 ? explicitReasons : reason ? [reason] : ["Rejected by stricter visual gate."];
}

function summaryMetrics(report: JsonObject | null): VisualReviewMetric[] {
  if (!report) return [];
  return [
    metric("SSIM", report.meanSsim, "min", 0.985),
    metric("Diff ratio", report.maxDiffRatio, "max", 0.004),
    metric("Silhouette", report.maxSilhouetteDiff, "max", 0.002),
    metric("Color", report.maxColorDelta, "max", 0.015),
    metric("Texture blur", report.maxTextureBlurDelta, "max", 0.02),
    metric("Material drift", report.maxMaterialDrift, "max", 0.02),
    metric("Scale", report.maxScaleDriftMeters, "max", 0.003),
    metric("Origin", report.maxOriginDriftMeters, "max", 0.003)
  ];
}

function angleMetrics(angle: JsonObject): VisualReviewMetric[] {
  return [
    metric("SSIM", angle.ssim, "min", 0.985),
    metric("Diff ratio", angle.maxDiffRatio, "max", 0.004),
    metric("Silhouette", angle.maxSilhouetteDiff, "max", 0.002),
    metric("Color", angle.maxColorDelta, "max", 0.015),
    metric("Texture blur", angle.maxTextureBlurDelta, "max", 0.02),
    metric("Material drift", angle.maxMaterialDrift, "max", 0.02)
  ];
}

function buildAngles(report: JsonObject | null, identity: VisualReviewIdentity): VisualReviewAngle[] {
  return objectArray(report?.angleReports).map((angle, index) => {
    const variant = stringValue(angle.variant, "candidate");
    const angleName = stringValue(angle.angle, `angle-${index + 1}`);
    return {
      id: `${variant}-${angleName}-${index}`,
      variant,
      angle: angleName,
      status: stringValue(angle.status, "unvalidated"),
      before: imageFromPath("before", angle.before, identity),
      after: imageFromPath("after", angle.after, identity),
      diff: imageFromPath("diff", angle.diff, identity),
      metrics: angleMetrics(angle)
    };
  });
}

function reportValidity(
  report: JsonObject | null,
  identity: VisualReviewIdentity
): { valid: boolean; reason: string } {
  if (!report) return { valid: false, reason: "No visual report is available." };
  if (stringValue(report.status, "passed") === "failed") {
    return { valid: false, reason: "The visual report failed strict comparison." };
  }

  const angles = buildAngles(report, identity);
  if (angles.length === 0) {
    return { valid: false, reason: "Visual report is missing angle evidence." };
  }
  const missingTriplet = angles.some((angle) => !angle.before || !angle.after || !angle.diff);
  if (missingTriplet) {
    return { valid: false, reason: "Visual report requires before/after/diff evidence for every angle." };
  }
  const failingMetric = [...summaryMetrics(report), ...angles.flatMap((angle) => angle.metrics)].find(
    (entry) => entry.status === "failed" || entry.status === "missing"
  );
  if (failingMetric) {
    return { valid: false, reason: `${failingMetric.label} is outside the strict visual threshold.` };
  }

  return { valid: true, reason: "" };
}

export function fingerprintVisualReport(value: unknown): string | null {
  if (!isObject(value)) return null;
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function parseAllowedOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[\s,;]+/)
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.startsWith("https://"));
}

export function sanitizeReviewModelUrl(
  value: unknown,
  options: ReviewModelUrlOptions = {}
):
  | { ok: true; url: string; origin: "public-runtime" | "cdn" }
  | { ok: false; error: string } {
  const raw = stringValue(value);
  if (!raw || raw.includes("\u0000")) return { ok: false, error: "Model URL is required." };

  if (raw.startsWith("/")) {
    const cleaned = cleanRelativePath(raw);
    if (!cleaned || !cleaned.startsWith("models/restaurants/")) {
      return { ok: false, error: "Model URL must stay under /models/restaurants." };
    }
    if (options.identity) {
      const expected = `models/restaurants/${options.identity.restaurantSlug}/${options.identity.menuSlug}/${options.identity.dishSlug}/${options.identity.version}/`;
      if (!cleaned.startsWith(expected)) {
        return { ok: false, error: "Model URL does not match the review identity." };
      }
    }
    if (extensionOf(cleaned) !== GLB_EXTENSION) {
      return { ok: false, error: "Only GLB models are allowed in the owner review viewer." };
    }
    return { ok: true, url: `/${cleaned}`, origin: "public-runtime" };
  }

  try {
    const url = new URL(raw);
    const allowedOrigins = new Set(options.allowedOrigins ?? []);
    if (url.protocol !== "https:" || !allowedOrigins.has(url.origin)) {
      return { ok: false, error: "Model CDN origin is not allowlisted." };
    }
    if (url.username || url.password || url.search || url.hash) {
      return { ok: false, error: "Model CDN URL must not include credentials, query or hash." };
    }
    if (url.pathname.includes("\\") || url.pathname.includes("..")) {
      return { ok: false, error: "Model CDN URL must not contain traversal." };
    }
    if (options.identity) {
      if (
        !cdnPathMatchesIdentity(
          url.pathname,
          options.identity,
          options.cdnBaseUrl ?? process.env.VISTAIRE_3D_CDN_BASE_URL
        )
      ) {
        return { ok: false, error: "Model CDN URL does not match the review identity." };
      }
    }
    if (extensionOf(url.pathname) !== GLB_EXTENSION) {
      return { ok: false, error: "Only GLB models are allowed in the owner review viewer." };
    }
    return { ok: true, url: url.toString(), origin: "cdn" };
  } catch {
    return { ok: false, error: "Model URL is invalid." };
  }
}

export function validateReviewArtifactPath(
  value: unknown
):
  | {
      ok: true;
      relativePath: string;
      contentType: string;
      kind: "review-image" | "model-glb";
    }
  | { ok: false; error: string } {
  const raw = stringValue(value);
  const relativePath = raw ? cleanRelativePath(raw) : null;
  if (!relativePath) return { ok: false, error: "Artifact path is invalid." };

  const extension = extensionOf(relativePath);
  if (relativePath.startsWith("assets/3d/reports/")) {
    const contentType = IMAGE_EXTENSIONS.get(extension);
    if (!contentType) return { ok: false, error: "Only visual image artifacts are allowed from reports." };
    return { ok: true, relativePath, contentType, kind: "review-image" };
  }

  if (
    extension === GLB_EXTENSION &&
    (relativePath.startsWith("assets/3d/source/") || relativePath.startsWith("assets/3d/work/"))
  ) {
    return { ok: true, relativePath, contentType: "model/gltf-binary", kind: "model-glb" };
  }

  return { ok: false, error: "Artifact path is outside the owner 3D/AR review allowlist." };
}

export function reviewArtifactPathMatchesIdentity(
  relativePath: string,
  identity: VisualReviewIdentity
): boolean {
  if (!isSafeIdentity(identity)) return false;
  const base = `${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}`;
  return (
    relativePath.startsWith(`assets/3d/reports/${base}/`) ||
    relativePath.startsWith(`assets/3d/source/${base}/`) ||
    relativePath.startsWith(`assets/3d/work/${base}/`)
  );
}

export function allowedVisualReviewArtifactPaths(state: VisualReviewState): Set<string> {
  const paths = new Set<string>();
  for (const angle of state.angles) {
    for (const image of [angle.before, angle.after, angle.diff]) {
      if (image?.path) paths.add(image.path);
    }
  }
  for (const model of [state.sourceModel, state.candidateModel]) {
    if (model?.origin === "owner-artifact" && model.artifactPath) {
      paths.add(model.artifactPath);
    }
  }
  return paths;
}

export function buildVisualReviewState(args: {
  identity: VisualReviewIdentity;
  visualReport?: unknown;
  candidateReport?: unknown;
  manifest?: unknown;
}): VisualReviewState {
  if (!isSafeIdentity(args.identity)) {
    throw new Error("Invalid visual review identity.");
  }

  const visualReport = isObject(args.visualReport) ? args.visualReport : null;
  const candidateReport = isObject(args.candidateReport) ? args.candidateReport : null;
  const manifest = isObject(args.manifest) ? args.manifest : null;
  const manifestVariants = isObject(manifest?.variants) ? manifest.variants : null;
  const webVariant = objectValue(manifestVariants?.web);
  const mobileVariant = objectValue(manifestVariants?.mobile);
  const candidate = isObject(visualReport?.candidate) ? visualReport.candidate : null;
  const source = isObject(visualReport?.source) ? visualReport.source : null;
  const validity = reportValidity(visualReport, args.identity);
  const candidateDecision = objectValue(candidateReport?.decision);
  const visualDecision = objectValue(visualReport?.decision);
  const selectedCandidate =
    stringValue(candidateReport?.selectedCandidate) ||
    stringValue(visualReport?.selectedCandidate) ||
    stringValue(manifest?.selectedCandidate) ||
    "No candidate selected";
  const rejectedCandidates = objectArray(candidateReport?.rejectedCandidates).map((entry) => ({
    name: stringValue(entry.name, "Rejected candidate"),
    reasons: reasonsFromCandidate(entry)
  }));

  return {
    identity: args.identity,
    hasVisualReport: Boolean(visualReport),
    visualReportValid: validity.valid,
    visualReportSha256: fingerprintVisualReport(visualReport),
    warning: validity.valid ? "" : validity.reason,
    sourceModel: modelFromArtifact("Source model", source?.path, args.identity),
    candidateModel:
      modelFromArtifact("Selected candidate", candidate?.path, args.identity) ??
      modelFromArtifact("Selected candidate", webVariant?.url, args.identity) ??
      modelFromArtifact("Selected candidate", mobileVariant?.url, args.identity),
    selectedCandidate,
    selectedCandidateReason:
      stringValue(candidateDecision?.reason) ||
      stringValue(visualDecision?.reason) ||
      "Candidate reason is not available yet.",
    rejectedCandidates,
    angles: buildAngles(visualReport, args.identity),
    summaryMetrics: summaryMetrics(visualReport),
    approval: {
      canApprove: validity.valid,
      disabledReason: validity.valid ? "" : validity.reason
    }
  };
}

export function validateVisualReviewAction(
  input: ReviewActionInput,
  state: VisualReviewState
):
  | {
      ok: true;
      reviewStatus: "approved" | "rejected";
      reviewerName?: string;
      note?: string;
      finalizesOrPublishes: false;
    }
  | { ok: false; error: string } {
  if (input.action === "approve") {
    if (!state.approval.canApprove) return { ok: false, error: state.approval.disabledReason };
    const reviewerName = stringValue(input.reviewerName);
    if (!reviewerName) return { ok: false, error: "Reviewer name is required before visual approval." };
    return {
      ok: true,
      reviewStatus: "approved",
      reviewerName,
      finalizesOrPublishes: false
    };
  }

  const note = stringValue(input.note);
  if (note.length < 8) return { ok: false, error: "Reject requires a clear note." };
  return {
    ok: true,
    reviewStatus: "rejected",
    note,
    finalizesOrPublishes: false
  };
}
