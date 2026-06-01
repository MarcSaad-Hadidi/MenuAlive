import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { SourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";

type JsonObject = Record<string, unknown>;
const RAW_REPORT_PREVIEW_BYTES = 16 * 1024;

export type CdnVariantKey = "web" | "mobile" | "arLite" | "iosUsdz" | "poster";
export type CdnVariantStatus =
  | "missing_manifest"
  | "missing_plan"
  | "planned"
  | "blocked"
  | "network_validated"
  | "failed";

export type CdnWorkflowVariant = {
  variant: CdnVariantKey;
  label: string;
  directory: string;
  planMatchesManifest: boolean;
  localPath: string;
  targetUrl: string;
  targetPath: string;
  bytes: number;
  sha256: string;
  contentType: string;
  requiredHeaders: Record<string, string>;
  uploadStatus: CdnVariantStatus;
  uploadStatusLabel: string;
  statusTone: "ready" | "warn" | "danger" | "muted";
  urlSafe: boolean;
  warning: string;
  network: {
    status: number | null;
    getStatus: number | null;
    contentType: string;
    contentDisposition: string;
    cacheControl: string;
    cors: string;
    contentLength: number | null;
    fetchedBytes: number | null;
    fetchedSha256: string;
    ok: boolean;
    warnings: string[];
  };
};

export type CdnWorkflowState = {
  identity: SourceUploadIdentity;
  storageConfigured: boolean;
  storageProvider: "supabase-storage" | "not-configured";
  storageStatusLabel: string;
  cdnBaseUrl: string;
  uploadPlanGenerated: boolean;
  uploadPlanCurrent: boolean;
  uploadPlanPath: string;
  uploadPlanGeneratedAt: string | null;
  networkReportPath: string;
  networkReportOk: boolean;
  networkReportSummary: {
    ok: boolean;
    name: string;
    baseUrl: string;
    fails: string[];
    warnings: string[];
    raw: string;
  } | null;
  variants: CdnWorkflowVariant[];
  requiresNetworkValidation: boolean;
  readyToFinalize: boolean;
  blockReason: string;
  manualUploadCommand: string;
  validateNetworkCommand: string;
};

export const CDN_VARIANTS: CdnVariantKey[] = [
  "web",
  "mobile",
  "arLite",
  "iosUsdz",
  "poster"
];

const VARIANT_DIRS: Record<CdnVariantKey, string> = {
  web: "web",
  mobile: "mobile",
  arLite: "ar-lite",
  iosUsdz: "ios",
  poster: "poster"
};

const VARIANT_LABELS: Record<CdnVariantKey, string> = {
  web: "Web GLB",
  mobile: "Mobile GLB",
  arLite: "Android AR-lite GLB",
  iosUsdz: "iOS USDZ",
  poster: "Poster"
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function cappedJsonPreview(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized.length <= RAW_REPORT_PREVIEW_BYTES) return serialized;
  return `${serialized.slice(0, RAW_REPORT_PREVIEW_BYTES)}\n... truncated for owner UI preview`;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readJsonObject(filePath: string): JsonObject | null {
  try {
    if (!existsSync(filePath)) return null;
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toRepoPath(filePath: string): string {
  return relative(process.cwd(), filePath).replaceAll("\\", "/");
}

function reportsPath(identity: SourceUploadIdentity): string {
  return [
    "assets/3d/reports",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version
  ].join("/");
}

function manifestPath(identity: SourceUploadIdentity): string {
  return [
    "public/models/restaurants",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version,
    "manifest.json"
  ].join("/");
}

function expectedPathSuffix(identity: SourceUploadIdentity, variant: CdnVariantKey): string {
  return `/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}/${VARIANT_DIRS[variant]}/`;
}

function cleanCdnBaseUrl(value?: string): string {
  const raw = String(value ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return "";
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "";
  }
}

function pathStartsWithBase(args: {
  pathname: string;
  cdnBaseUrl: string;
  origin: string;
  identity: SourceUploadIdentity;
  variant: CdnVariantKey;
}): boolean {
  if (!args.cdnBaseUrl) {
    return args.pathname.startsWith(expectedPathSuffix(args.identity, args.variant));
  }

  const parsedBase = new URL(args.cdnBaseUrl);
  if (parsedBase.origin !== args.origin) return false;
  const basePath = parsedBase.pathname.replace(/\/+$/, "");
  return args.pathname.startsWith(`${basePath}${expectedPathSuffix(args.identity, args.variant)}`);
}

function extensionOk(variant: CdnVariantKey, pathname: string): boolean {
  const lower = pathname.toLowerCase();
  if (variant === "iosUsdz") return lower.endsWith(".usdz");
  if (variant === "poster") return /\.(?:png|jpe?g|webp|avif|svg)$/i.test(lower);
  return lower.endsWith(".glb");
}

function contentTypeForVariant(variant: CdnVariantKey, url: string): string {
  const lower = url.toLowerCase();
  if (variant === "iosUsdz" || lower.endsWith(".usdz")) return "model/vnd.usdz+zip";
  if (["web", "mobile", "arLite"].includes(variant) || lower.endsWith(".glb")) return "model/gltf-binary";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function requiredHeadersForVariant(variant: CdnVariantKey, contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    ...(variant === "iosUsdz" ? { "Content-Disposition": "inline" } : {}),
    ...(variant !== "iosUsdz" ? { CORS: "* or VISTAIRE_APP_ORIGIN" } : {})
  };
}

function uploadStatusLabel(status: CdnVariantStatus): string {
  if (status === "network_validated") return "Network validated";
  if (status === "planned") return "Planned";
  if (status === "failed") return "Network failed";
  if (status === "blocked") return "Blocked";
  if (status === "missing_manifest") return "Missing manifest";
  return "Plan missing";
}

function toneForStatus(status: CdnVariantStatus): CdnWorkflowVariant["statusTone"] {
  if (status === "network_validated") return "ready";
  if (status === "failed" || status === "blocked") return "danger";
  if (status === "planned" || status === "missing_plan") return "warn";
  return "muted";
}

export function parseCdnAllowedOrigins(value?: string): string[] {
  return String(value ?? "")
    .split(/[\s,;]+/)
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.startsWith("https://"));
}

export function sanitizeCdnTargetUrl(args: {
  identity: SourceUploadIdentity;
  variant: CdnVariantKey;
  url: unknown;
  allowedOrigins?: string[];
  cdnBaseUrl?: string;
}): { ok: true; url: string; targetPath: string } | { ok: false; error: string } {
  const raw = stringValue(args.url);
  if (!raw) return { ok: false, error: "Target CDN URL is missing." };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Target CDN URL must be a valid HTTPS URL." };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "Target CDN URL must use HTTPS." };
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return { ok: false, error: "Target CDN URL must not include credentials, query or hash." };
  }
  if (parsed.pathname.includes("\\") || parsed.pathname.includes("..")) {
    return { ok: false, error: "Target CDN URL must not contain traversal." };
  }
  if (!new Set(args.allowedOrigins ?? []).has(parsed.origin)) {
    return { ok: false, error: "Target CDN origin is not allowlisted." };
  }
  const cdnBaseUrl = cleanCdnBaseUrl(args.cdnBaseUrl);
  const suffix = expectedPathSuffix(args.identity, args.variant);
  if (!pathStartsWithBase({
    pathname: parsed.pathname,
    origin: parsed.origin,
    cdnBaseUrl,
    identity: args.identity,
    variant: args.variant
  })) {
    return cdnBaseUrl
      ? { ok: false, error: `Target CDN URL must start with ${cdnBaseUrl}${suffix}.` }
      : { ok: false, error: `Target CDN URL must start with ${suffix}.` };
  }
  if (!extensionOk(args.variant, parsed.pathname)) {
    return { ok: false, error: `${args.variant} target URL has the wrong extension.` };
  }
  return { ok: true, url: parsed.toString(), targetPath: parsed.pathname };
}

function uploadPlanEntry(uploadPlan: JsonObject | null, variant: CdnVariantKey): JsonObject | null {
  const uploads = Array.isArray(uploadPlan?.uploads) ? uploadPlan.uploads : [];
  return uploads.find((entry) => isObject(entry) && entry.variant === variant) as JsonObject | null;
}

function reportMetric(networkReport: JsonObject | null, targetUrl: string): JsonObject | null {
  const assets =
    isObject(networkReport?.metrics) && Array.isArray(networkReport.metrics.assets)
      ? networkReport.metrics.assets
      : [];
  return assets.find((entry) => isObject(entry) && stringValue(entry.url) === targetUrl) as JsonObject | null;
}

function sameUrl(left: string, right: string): boolean {
  try {
    return new URL(left).toString() === new URL(right).toString();
  } catch {
    return left === right;
  }
}

function planMatchesManifest(args: {
  plan: JsonObject | null;
  manifestVariant: JsonObject | null;
  contentType: string;
}): { ok: boolean; warning: string } {
  if (!args.plan) return { ok: false, warning: "Upload plan entry is missing." };
  if (!args.manifestVariant) return { ok: false, warning: "Manifest variant is missing." };

  const warnings: string[] = [];
  const planUrl = stringValue(args.plan.url);
  const manifestUrl = stringValue(args.manifestVariant.url);
  if (!planUrl || !manifestUrl || !sameUrl(planUrl, manifestUrl)) {
    warnings.push("Upload plan URL does not match manifest URL.");
  }
  const manifestBytes = numberValue(args.manifestVariant.bytes);
  if (manifestBytes > 0 && numberValue(args.plan.bytes) !== manifestBytes) {
    warnings.push("Upload plan bytes do not match manifest bytes.");
  }
  const manifestSha = stringValue(args.manifestVariant.sha256);
  if (manifestSha && stringValue(args.plan.sha256) !== manifestSha) {
    warnings.push("Upload plan SHA-256 does not match manifest SHA-256.");
  }
  if (stringValue(args.plan.contentType).toLowerCase() !== args.contentType.toLowerCase()) {
    warnings.push("Upload plan content-type does not match manifest target.");
  }

  return {
    ok: warnings.length === 0,
    warning: warnings.join(" ")
  };
}

function cacheImmutable(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.includes("public") && lower.includes("max-age=31536000") && lower.includes("immutable");
}

function corsOk(value: string, appOrigin = ""): boolean {
  return value === "*" || Boolean(appOrigin && value === appOrigin);
}

function variantNetworkState(args: {
  variant: CdnVariantKey;
  manifestVariant: JsonObject | null;
  metric: JsonObject | null;
  targetUrl: string;
  contentType: string;
  appOrigin?: string;
}): CdnWorkflowVariant["network"] {
  const warnings: string[] = [];
  const metric = args.metric;
  if (!metric) {
    return {
      status: null,
      getStatus: null,
      contentType: "",
      contentDisposition: "",
      cacheControl: "",
      cors: "",
      contentLength: null,
      fetchedBytes: null,
      fetchedSha256: "",
      ok: false,
      warnings: ["Network validation report is missing this asset."]
    };
  }

  const status = numberValue(metric.status) || null;
  const getStatus = numberValue(metric.getStatus) || null;
  const contentType = stringValue(metric.contentType);
  const contentDisposition = stringValue(metric.contentDisposition);
  const cacheControl = stringValue(metric.cacheControl);
  const cors = stringValue(metric.accessControlAllowOrigin);
  const contentLength = numberValue(metric.contentLength) || null;
  const fetchedBytes = numberValue(metric.fetchedBytes) || null;
  const fetchedSha256 = stringValue(metric.fetchedSha256);
  const expectedBytes = numberValue(args.manifestVariant?.bytes);
  const expectedSha = stringValue(args.manifestVariant?.sha256);

  if (!status || status < 200 || status >= 300) warnings.push("HEAD status is not 2xx.");
  if (!getStatus || getStatus < 200 || getStatus >= 300) warnings.push("GET status is not 2xx.");
  if (contentType.split(";")[0].trim().toLowerCase() !== args.contentType.toLowerCase()) {
    warnings.push("MIME does not match.");
  }
  if (!cacheImmutable(cacheControl)) warnings.push("Cache-Control is not immutable.");
  if (args.variant === "iosUsdz" && !contentDisposition.toLowerCase().includes("inline")) {
    warnings.push("USDZ is not inline.");
  }
  if (args.variant !== "iosUsdz" && !corsOk(cors, args.appOrigin)) warnings.push("CORS is not allowed.");
  if (expectedBytes > 0 && contentLength !== expectedBytes) warnings.push("Content-Length does not match.");
  if (expectedBytes > 0 && fetchedBytes !== expectedBytes) warnings.push("Fetched bytes do not match.");
  if (expectedSha && fetchedSha256 !== expectedSha) warnings.push("Fetched SHA-256 does not match.");

  return {
    status,
    getStatus,
    contentType,
    contentDisposition,
    cacheControl,
    cors,
    contentLength,
    fetchedBytes,
    fetchedSha256,
    ok: warnings.length === 0,
    warnings
  };
}

function buildVariant(args: {
  identity: SourceUploadIdentity;
  variant: CdnVariantKey;
  manifest: JsonObject | null;
  uploadPlan: JsonObject | null;
  networkReport: JsonObject | null;
  allowedOrigins: string[];
  cdnBaseUrl: string;
  appOrigin?: string;
}): CdnWorkflowVariant {
  const manifestVariants: JsonObject = isObject(args.manifest?.variants)
    ? args.manifest.variants
    : {};
  const maybeManifestVariant = manifestVariants[args.variant];
  const manifestVariant: JsonObject | null = isObject(maybeManifestVariant)
    ? maybeManifestVariant
    : null;
  const plan = uploadPlanEntry(args.uploadPlan, args.variant);
  const rawUrl = stringValue(manifestVariant?.url, stringValue(plan?.url));
  const safe = sanitizeCdnTargetUrl({
    identity: args.identity,
    variant: args.variant,
    url: rawUrl,
    allowedOrigins: args.allowedOrigins,
    cdnBaseUrl: args.cdnBaseUrl
  });
  const contentType = contentTypeForVariant(args.variant, rawUrl);
  const planFreshness = planMatchesManifest({ plan, manifestVariant, contentType });
  const targetUrl = safe.ok ? safe.url : rawUrl;
  const metric = safe.ok ? reportMetric(args.networkReport, safe.url) : null;
  const network = variantNetworkState({
    variant: args.variant,
    manifestVariant,
    metric,
    targetUrl,
    contentType,
    appOrigin: args.appOrigin
  });
  const hasPlan = Boolean(plan);
  const hasManifest = Boolean(manifestVariant);
  const status: CdnVariantStatus =
    !hasManifest
      ? "missing_manifest"
      : !safe.ok
        ? "blocked"
        : !hasPlan
          ? "missing_plan"
        : hasPlan && !planFreshness.ok
          ? "blocked"
        : network.ok
          ? "network_validated"
          : metric
            ? "failed"
            : "planned";

  return {
    variant: args.variant,
    label: VARIANT_LABELS[args.variant],
    directory: VARIANT_DIRS[args.variant],
    planMatchesManifest: planFreshness.ok,
    localPath: stringValue(
      plan?.localPath,
      rawUrl
        ? `assets/3d/work/${args.identity.restaurantSlug}/${args.identity.menuSlug}/${args.identity.dishSlug}/${args.identity.version}/${VARIANT_DIRS[args.variant]}/${basename(new URL(rawUrl, "https://local.invalid").pathname)}`
        : ""
    ),
    targetUrl,
    targetPath: safe.ok ? safe.targetPath : "",
    bytes: numberValue(plan?.bytes) || numberValue(manifestVariant?.bytes),
    sha256: stringValue(plan?.sha256, stringValue(manifestVariant?.sha256)),
    contentType,
    requiredHeaders: requiredHeadersForVariant(args.variant, contentType),
    uploadStatus: status,
    uploadStatusLabel: uploadStatusLabel(status),
    statusTone: toneForStatus(status),
    urlSafe: safe.ok,
    warning: [safe.ok ? "" : safe.error, hasPlan && !planFreshness.ok ? planFreshness.warning : ""]
      .filter(Boolean)
      .join(" "),
    network
  };
}

export function buildCdnWorkflowState(args: {
  identity: SourceUploadIdentity;
  manifest?: unknown;
  uploadPlan?: unknown;
  networkReport?: unknown;
  allowedOrigins?: string[];
  cdnBaseUrl?: string;
  appOrigin?: string;
  storageConfigured?: boolean;
}): CdnWorkflowState {
  const manifest = isObject(args.manifest) ? args.manifest : null;
  const uploadPlan = isObject(args.uploadPlan) ? args.uploadPlan : null;
  const networkReport = isObject(args.networkReport) ? args.networkReport : null;
  const allowedOrigins = args.allowedOrigins ?? parseCdnAllowedOrigins(process.env.VISTAIRE_3D_CDN_ORIGINS);
  const cdnBaseUrl = cleanCdnBaseUrl(args.cdnBaseUrl ?? process.env.VISTAIRE_3D_CDN_BASE_URL);
  const variants = CDN_VARIANTS.map((variant) =>
    buildVariant({
      identity: args.identity,
      variant,
      manifest,
      uploadPlan,
      networkReport,
      allowedOrigins,
      cdnBaseUrl,
      appOrigin: args.appOrigin ?? process.env.VISTAIRE_APP_ORIGIN
    })
  );
  const external = variants.some((variant) => variant.targetUrl.startsWith("https://"));
  const unsafeExternal = variants.some(
    (variant) => variant.targetUrl.startsWith("https://") && !variant.urlSafe
  );
  const uploadPlanGenerated = Boolean(uploadPlan?.ok === true && Array.isArray(uploadPlan.uploads) && uploadPlan.uploads.length === 5);
  const uploadPlanCurrent = uploadPlanGenerated && variants.every((variant) => variant.planMatchesManifest);
  const networkReportOk = Boolean(
    networkReport?.ok === true &&
      networkReport.name === "network-headers" &&
      !unsafeExternal &&
      variants.every((variant) => variant.network.ok)
  );
  const requiresNetworkValidation = external || unsafeExternal;
  const readyToFinalize = requiresNetworkValidation ? networkReportOk && uploadPlanCurrent : true;
  const reportFails = Array.isArray(networkReport?.fails) ? networkReport.fails.map(String) : [];
  const reportWarnings = Array.isArray(networkReport?.warnings) ? networkReport.warnings.map(String) : [];
  const storageConfigured = Boolean(args.storageConfigured);
  const reportPath = `${reportsPath(args.identity)}/network-validation.json`;

  return {
    identity: args.identity,
    storageConfigured,
    storageProvider: storageConfigured ? "supabase-storage" : "not-configured",
    storageStatusLabel: storageConfigured ? "Supabase storage configured" : "storage not configured",
    cdnBaseUrl,
    uploadPlanGenerated,
    uploadPlanCurrent,
    uploadPlanPath: `${reportsPath(args.identity)}/upload-plan.json`,
    uploadPlanGeneratedAt: stringValue(uploadPlan?.generatedAt) || null,
    networkReportPath: reportPath,
    networkReportOk,
    networkReportSummary: networkReport
      ? {
          ok: networkReportOk,
          name: stringValue(networkReport.name),
          baseUrl: isObject(networkReport.metrics) ? stringValue(networkReport.metrics.baseUrl) : "",
          fails: reportFails,
          warnings: reportWarnings,
          raw: cappedJsonPreview(networkReport)
        }
      : null,
    variants,
    requiresNetworkValidation,
    readyToFinalize,
    blockReason: readyToFinalize
      ? ""
      : unsafeExternal
        ? "CDN target URL safety must pass before finalize."
        : uploadPlanGenerated && !uploadPlanCurrent
          ? "CDN upload plan is stale or does not match the manifest."
          : !uploadPlanGenerated
            ? "CDN upload plan is required before finalize."
        : networkReport
        ? "CDN network validation is failing or incomplete."
        : "CDN network validation report is required before finalize.",
    manualUploadCommand: `npm run 3d:prepare-cdn-upload -- --manifest ${manifestPath(args.identity)} --out ${reportsPath(args.identity)}/upload-plan.json --write`,
    validateNetworkCommand: `npm run 3d:validate-network -- --base-url ${cdnBaseUrl || "<https://your-vistaire-origin>"} --manifest ${manifestPath(args.identity)} --strict --out ${reportPath}`
  };
}

export function cdnStorageConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.VISTAIRE_3D_CDN_BUCKET?.trim() && env.VISTAIRE_3D_CDN_BASE_URL?.trim());
}

export function buildCdnWorkflowFromFiles(identity: SourceUploadIdentity): CdnWorkflowState {
  const root = process.cwd();
  const reportDir = join(
    root,
    "assets",
    "3d",
    "reports",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version
  );
  const manifest = readJsonObject(join(root, manifestPath(identity)));
  const uploadPlan = readJsonObject(join(reportDir, "upload-plan.json"));
  const networkReport = readJsonObject(join(reportDir, "network-validation.json"));
  const state = buildCdnWorkflowState({
    identity,
    manifest,
    uploadPlan,
    networkReport,
    storageConfigured: cdnStorageConfigured()
  });
  return {
    ...state,
    uploadPlanPath: uploadPlan ? toRepoPath(join(reportDir, "upload-plan.json")) : state.uploadPlanPath,
    networkReportPath: networkReport ? toRepoPath(join(reportDir, "network-validation.json")) : state.networkReportPath
  };
}
