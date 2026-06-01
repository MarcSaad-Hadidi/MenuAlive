import { createHash } from "node:crypto";
import type { SourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";

export type DeviceQaTarget = "iphoneQuickLook" | "androidSceneViewer";
export type DeviceQaStatus = "not-tested" | "passed" | "failed" | "blocked";

export type DeviceQaEvidenceInput = {
  originalName: string;
  mimeType: string;
  bytes: ArrayBuffer | ArrayBufferView;
};

export type DeviceQaSubmissionInput = {
  target?: unknown;
  status?: unknown;
  deviceName?: unknown;
  osVersion?: unknown;
  browserVersion?: unknown;
  arcoreStatus?: unknown;
  network?: unknown;
  testedBy?: unknown;
  testedAt?: unknown;
  notes?: unknown;
  evidence?: DeviceQaEvidenceInput | null;
};

export type DeviceQaRecord = {
  target: DeviceQaTarget;
  status: DeviceQaStatus;
  deviceName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  arcoreStatus: string;
  network: string;
  notes: string;
  testedBy: string;
  testedAt: string | null;
  evidence: {
    originalName: string;
    mimeType: string;
    bytes: number;
    sha256: string;
  } | null;
};

type DeviceQaUrlIdentityOptions = {
  identity?: SourceUploadIdentity;
  allowedOrigins?: string[];
  cdnBaseUrl?: string;
};

export type DeviceQaTargetState = DeviceQaRecord & {
  title: string;
  statusLabel: string;
  statusTone: "ready" | "warn" | "danger" | "muted";
  requiredBrowser: string;
  assetUrl: string | null;
  assetUrlSafe: boolean;
  assetWarning: string;
  instructions: string[];
  checklist: string[];
  manualCommand: string;
};

export type DeviceQaState = {
  identity: SourceUploadIdentity;
  targets: DeviceQaTargetState[];
  canPublish: boolean;
  publishBlockReason: string;
};

const TARGETS: DeviceQaTarget[] = ["iphoneQuickLook", "androidSceneViewer"];
const TEXT_EVIDENCE_MIME_TYPES = new Set([
  "text/markdown",
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp"
]);
const EXTENSIONS_BY_TARGET: Record<DeviceQaTarget, string> = {
  iphoneQuickLook: ".usdz",
  androidSceneViewer: ".glb"
};
const TARGET_LABELS: Record<DeviceQaTarget, string> = {
  iphoneQuickLook: "iPhone Quick Look",
  androidSceneViewer: "Android Scene Viewer"
};
const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function cleanText(value: unknown, maxLength: number): string {
  return stringValue(value).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, maxLength).trim();
}

function normalizeBytes(bytes: ArrayBuffer | ArrayBufferView): Buffer {
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function extensionOf(pathname: string): string {
  const match = pathname.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function hashBytes(bytes: ArrayBuffer | ArrayBufferView): string {
  return createHash("sha256").update(normalizeBytes(bytes)).digest("hex");
}

function cleanEvidenceName(value: string): string {
  return (
    value
      .split(/[\\/]+/)
      .filter(Boolean)
      .pop()
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "device-qa-evidence.txt"
  );
}

function targetFromValue(value: unknown): DeviceQaTarget | null {
  return TARGETS.includes(value as DeviceQaTarget) ? (value as DeviceQaTarget) : null;
}

function statusFromValue(value: unknown): DeviceQaStatus | null {
  return ["not-tested", "passed", "failed", "blocked"].includes(value as DeviceQaStatus)
    ? (value as DeviceQaStatus)
    : null;
}

function statusTone(status: DeviceQaStatus): DeviceQaTargetState["statusTone"] {
  if (status === "passed") return "ready";
  if (status === "failed") return "danger";
  if (status === "blocked") return "warn";
  return "muted";
}

function statusLabel(status: DeviceQaStatus): string {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "blocked") return "Blocked";
  return "Not tested";
}

export function hasCompleteDeviceQaEvidence(evidence: DeviceQaRecord["evidence"]): boolean {
  return Boolean(
    evidence &&
      /^[a-f0-9]{64}$/i.test(evidence.sha256) &&
      Number.isFinite(evidence.bytes) &&
      evidence.bytes > 0
  );
}

function recordFromManifest(target: DeviceQaTarget, manifest: Record<string, unknown> | null): DeviceQaRecord {
  const realDeviceQa = isObject(manifest?.quality) && isObject(manifest.quality.realDeviceQa)
    ? manifest.quality.realDeviceQa
    : null;
  const entry = realDeviceQa && isObject(realDeviceQa[target]) ? realDeviceQa[target] : null;
  const evidence = isObject(entry?.evidence)
    ? {
        originalName: stringValue(entry.evidence.originalName || entry.evidence.path, "Recorded evidence"),
        mimeType: stringValue(entry.evidence.mimeType, "text/plain"),
        bytes: Number(entry.evidence.bytes ?? 0),
        sha256: stringValue(entry.evidence.sha256)
      }
    : null;

  return {
    target,
    status: statusFromValue(entry?.status) ?? "not-tested",
    deviceName: stringValue(entry?.device || entry?.deviceName),
    osVersion: stringValue(entry?.os || entry?.osVersion),
    browserName: stringValue(entry?.browserName, target === "iphoneQuickLook" ? "Safari" : "Chrome"),
    browserVersion: stringValue(entry?.browserVersion),
    arcoreStatus: stringValue(entry?.arcore || entry?.arcoreStatus),
    network: stringValue(entry?.network),
    notes: stringValue(entry?.notes),
    testedBy: stringValue(entry?.testedBy || entry?.tested_by),
    testedAt: stringValue(entry?.testedAt) || null,
    evidence
  };
}

function identityPath(identity: SourceUploadIdentity): string {
  return `${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}`;
}

function cdnBasePath(cdnBaseUrl?: string): string {
  const raw = cdnBaseUrl?.trim();
  if (!raw) return "";
  try {
    return new URL(raw).pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function pathMatchesIdentity(
  pathname: string,
  target: DeviceQaTarget,
  identity?: SourceUploadIdentity,
  cdnBaseUrl?: string
): boolean {
  if (!identity) return true;
  const expectedVariant = target === "iphoneQuickLook" ? "ios" : "ar-lite";
  const identityPrefix = `/${identityPath(identity)}/${expectedVariant}/`;
  const prefixes = [
    `/models/restaurants${identityPrefix}`,
    identityPrefix
  ];
  const basePath = cdnBasePath(cdnBaseUrl);
  if (basePath) prefixes.unshift(`${basePath}${identityPrefix}`);

  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function variantAssetUrl(target: DeviceQaTarget, manifest: Record<string, unknown> | null): string {
  const variants = isObject(manifest?.variants) ? manifest.variants : null;
  if (target === "iphoneQuickLook") {
    const ios = isObject(variants?.iosUsdz) ? variants.iosUsdz : null;
    return stringValue(ios?.url);
  }
  const arLite = isObject(variants?.arLite) ? variants.arLite : null;
  return stringValue(arLite?.url);
}

function instructionsFor(target: DeviceQaTarget): string[] {
  if (target === "iphoneQuickLook") {
    return [
      "Open the asset link on a real iPhone in Safari.",
      "Tap the AR / Quick Look action only after the page is visible.",
      "Confirm Quick Look opens the USDZ without download loops or redirects.",
      "Inspect scale, grounding, orientation and texture under restaurant lighting."
    ];
  }
  return [
    "Open the asset link on a real Android device in Chrome with ARCore support.",
    "Tap the AR / Scene Viewer action only after the page is visible.",
    "Confirm Scene Viewer opens, or record the unsupported-device fallback.",
    "Inspect scale, grounding, orientation and texture before returning to Chrome."
  ];
}

function checklistFor(target: DeviceQaTarget): string[] {
  if (target === "iphoneQuickLook") {
    return ["Safari required", "Stable USDZ URL", "No query or hash", "Scale", "Grounding", "Orientation", "Texture"];
  }
  return ["Chrome required", "ARCore support", "Scene Viewer opens", "Fallback recorded", "Scale", "Grounding", "Orientation", "Texture"];
}

function manualCommandFor(identity: SourceUploadIdentity, target: DeviceQaTarget): string {
  const device = target === "iphoneQuickLook" ? "iphoneQuickLook" : "androidSceneViewer";
  const evidence = target === "iphoneQuickLook" ? "iphone.md" : "android.md";
  return [
    "npm run 3d:record-device-qa --",
    `--manifest public/models/restaurants/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}/manifest.json`,
    `--device ${device}`,
    "--status passed",
    '--device-name "<device>"',
    '--os "<os>"',
    '--tested-by "<owner>"',
    '--tested-at "<iso-date>"',
    `--evidence assets/3d/reports/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}/device-qa/${evidence}`,
    "--write"
  ].join(" ");
}

export function parseAllowedOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[\s,;]+/)
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.startsWith("https://"));
}

export function sanitizeDeviceQaAssetUrl(
  value: unknown,
  target: DeviceQaTarget | string,
  options: DeviceQaUrlIdentityOptions = {}
):
  | { ok: true; url: string; origin: "public-runtime" | "cdn" }
  | { ok: false; error: string } {
  const qaTarget = targetFromValue(target);
  if (!qaTarget) return { ok: false, error: "Unknown device QA target." };
  const raw = stringValue(value);
  if (!raw || raw.includes("\u0000")) return { ok: false, error: "Asset URL is missing." };
  const requiredExtension = EXTENSIONS_BY_TARGET[qaTarget];

  if (raw.startsWith("/")) {
    if (!raw.startsWith("/models/restaurants/")) {
      return { ok: false, error: "Device QA asset URL must stay under /models/restaurants." };
    }
    if (raw.includes("..") || raw.includes("\\")) {
      return { ok: false, error: "Device QA asset URL must not contain traversal." };
    }
    if (qaTarget === "androidSceneViewer" && !raw.includes("/ar-lite/")) {
      return { ok: false, error: "Android Scene Viewer QA requires the AR-lite GLB variant." };
    }
    if (qaTarget === "iphoneQuickLook" && !raw.includes("/ios/")) {
      return { ok: false, error: "iPhone Quick Look QA requires the iOS USDZ variant." };
    }
    if (!pathMatchesIdentity(raw, qaTarget, options.identity, options.cdnBaseUrl)) {
      return { ok: false, error: "Device QA asset URL must match the reviewed asset identity." };
    }
    if (raw.includes("?") || raw.includes("#")) {
      return { ok: false, error: "Device QA asset URL must be stable without query or hash." };
    }
    if (extensionOf(raw) !== requiredExtension) {
      return { ok: false, error: `Device QA asset must use ${requiredExtension}.` };
    }
    return { ok: true, url: raw, origin: "public-runtime" };
  }

  try {
    const url = new URL(raw);
    const allowedOrigins = new Set(options.allowedOrigins ?? []);
    if (url.protocol !== "https:" || !allowedOrigins.has(url.origin)) {
      return { ok: false, error: "Device QA CDN origin is not allowlisted." };
    }
    if (url.username || url.password || url.search || url.hash) {
      return { ok: false, error: "Device QA asset URL must not include credentials, query or hash." };
    }
    if (qaTarget === "androidSceneViewer" && !url.pathname.includes("/ar-lite/")) {
      return { ok: false, error: "Android Scene Viewer QA requires the AR-lite GLB variant." };
    }
    if (qaTarget === "iphoneQuickLook" && !url.pathname.includes("/ios/")) {
      return { ok: false, error: "iPhone Quick Look QA requires the iOS USDZ variant." };
    }
    if (
      !pathMatchesIdentity(
        url.pathname,
        qaTarget,
        options.identity,
        options.cdnBaseUrl ?? process.env.VISTAIRE_3D_CDN_BASE_URL
      )
    ) {
      return { ok: false, error: "Device QA asset URL must match the reviewed asset identity." };
    }
    if (extensionOf(url.pathname) !== requiredExtension) {
      return { ok: false, error: `Device QA asset must use ${requiredExtension}.` };
    }
    return { ok: true, url: url.toString(), origin: "cdn" };
  } catch {
    return { ok: false, error: "Device QA asset URL is invalid." };
  }
}

export function buildDeviceQaState(args: {
  identity: SourceUploadIdentity;
  manifest?: unknown;
}): DeviceQaState {
  const manifest = isObject(args.manifest) ? args.manifest : null;
  const targets = TARGETS.map((target): DeviceQaTargetState => {
    const record = recordFromManifest(target, manifest);
    const rawAssetUrl = variantAssetUrl(target, manifest);
    const safeAsset = sanitizeDeviceQaAssetUrl(rawAssetUrl, target, {
      identity: args.identity,
      allowedOrigins: parseAllowedOrigins(process.env.VISTAIRE_3D_CDN_ORIGINS)
    });

    return {
      ...record,
      title: TARGET_LABELS[target],
      statusLabel: statusLabel(record.status),
      statusTone: statusTone(record.status),
      requiredBrowser: target === "iphoneQuickLook" ? "Safari" : "Chrome / ARCore",
      assetUrl: safeAsset.ok ? safeAsset.url : null,
      assetUrlSafe: safeAsset.ok,
      assetWarning: safeAsset.ok ? "" : safeAsset.error,
      instructions: instructionsFor(target),
      checklist: checklistFor(target),
      manualCommand: manualCommandFor(args.identity, target)
    };
  });
  const missing = targets.find((target) => target.status !== "passed" || !hasCompleteDeviceQaEvidence(target.evidence));

  return {
    identity: args.identity,
    targets,
    canPublish: !missing,
    publishBlockReason: missing
      ? `${missing.title} real-device evidence is required before publish readiness.`
      : ""
  };
}

export function mergeDeviceQaRecords(state: DeviceQaState, records: DeviceQaRecord[]): DeviceQaState {
  const byTarget = new Map<DeviceQaTarget, DeviceQaRecord>();
  for (const record of records) {
    if (!byTarget.has(record.target)) byTarget.set(record.target, record);
  }
  const targets = state.targets.map((target): DeviceQaTargetState => {
    const record = byTarget.get(target.target);
    if (!record) return target;
    return {
      ...target,
      ...record,
      statusLabel: statusLabel(record.status),
      statusTone: statusTone(record.status)
    };
  });
  const missing = targets.find((target) => target.status !== "passed" || !hasCompleteDeviceQaEvidence(target.evidence));
  return {
    ...state,
    targets,
    canPublish: !missing,
    publishBlockReason: missing
      ? `${missing.title} real-device evidence is required before publish readiness.`
      : ""
  };
}

export function validateDeviceQaEvidence(
  evidence: DeviceQaEvidenceInput | null | undefined
):
  | { ok: true; evidence: DeviceQaRecord["evidence"] }
  | { ok: false; error: string } {
  if (!evidence) return { ok: false, error: "Evidence upload is required for a passed device QA result." };
  const bytes = normalizeBytes(evidence.bytes);
  const mimeType = stringValue(evidence.mimeType).split(";")[0].trim().toLowerCase();
  if (!TEXT_EVIDENCE_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "Evidence must be Markdown, text, PDF, PNG, JPEG, or WebP." };
  }
  if (bytes.byteLength <= 0 || bytes.byteLength > 5 * 1024 * 1024) {
    return { ok: false, error: "Evidence file must be between 1 byte and 5 MB." };
  }
  return {
    ok: true,
    evidence: {
      originalName: cleanEvidenceName(evidence.originalName),
      mimeType,
      bytes: bytes.byteLength,
      sha256: hashBytes(bytes)
    }
  };
}

export function validateDeviceQaSubmission(
  input: DeviceQaSubmissionInput,
  _state: DeviceQaState
):
  | { ok: true; record: DeviceQaRecord }
  | { ok: false; error: string } {
  const target = targetFromValue(input.target);
  if (!target) return { ok: false, error: "Device QA target is invalid." };
  const status = statusFromValue(input.status);
  if (!status) return { ok: false, error: "Device QA status is invalid." };

  const notes = cleanText(input.notes, 2000);
  const deviceName = cleanText(input.deviceName, 160);
  const osVersion = cleanText(input.osVersion, 160);
  const browserVersion = cleanText(input.browserVersion, 160);
  const arcoreStatus = cleanText(input.arcoreStatus, 160);
  const network = cleanText(input.network, 160);
  const testedBy = cleanText(input.testedBy, 160);
  const testedAtRaw = cleanText(input.testedAt, 80);
  const testedAt = testedAtRaw && !Number.isNaN(Date.parse(testedAtRaw))
    ? new Date(testedAtRaw).toISOString()
    : null;
  const targetState = _state.targets.find((entry) => entry.target === target);

  if (status === "passed") {
    if (!targetState?.assetUrlSafe || !targetState.assetUrl) {
      return { ok: false, error: "A safe device QA asset URL is required before recording a passed result." };
    }
    for (const [label, value] of [
      ["device name", deviceName],
      ["OS", osVersion],
      ["browser version", browserVersion],
      ["network", network],
      ["tested by", testedBy]
    ]) {
      if (!value) return { ok: false, error: `${label} is required when Device QA passes.` };
    }
    if (!testedAt) return { ok: false, error: "testedAt must be an ISO date when Device QA passes." };
    if (target === "androidSceneViewer" && !arcoreStatus) {
      return { ok: false, error: "ARCore status is required when Android Scene Viewer QA passes." };
    }
    const evidence = validateDeviceQaEvidence(input.evidence);
    if (!evidence.ok) return evidence;
    return {
      ok: true,
      record: {
        target,
        status,
        deviceName,
        osVersion,
        browserName: target === "iphoneQuickLook" ? "Safari" : "Chrome",
        browserVersion,
        arcoreStatus,
        network,
        notes,
        testedBy,
        testedAt,
        evidence: evidence.evidence
      }
    };
  }

  if ((status === "failed" || status === "blocked") && notes.length < 8) {
    return { ok: false, error: "Fail or blocked Device QA requires a clear note." };
  }

  return {
    ok: true,
    record: {
      target,
      status,
      deviceName,
      osVersion,
      browserName: target === "iphoneQuickLook" ? "Safari" : "Chrome",
      browserVersion,
      arcoreStatus,
      network,
      notes,
      testedBy,
      testedAt,
      evidence: null
    }
  };
}

export function formatEvidenceSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "No evidence";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${NUMBER_FORMAT.format(Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
