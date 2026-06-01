import type { CdnWorkflowState } from "@/lib/owner/threeDCdnWorkflow";
import type { SourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";

type JsonObject = Record<string, unknown>;

export type LifecycleGateStatus = "passed" | "missing" | "failed" | "warning";

export type Owner3dEvidenceLink = {
  label: string;
  path?: string;
  url?: string;
  sha256?: string;
  bytes?: number;
  mimeType?: string;
  private?: boolean;
};

export type Owner3dLifecycleGate = {
  id:
    | "visual_report"
    | "human_approval"
    | "iphone_qa"
    | "android_qa"
    | "cdn_or_local"
    | "no_warnings"
    | "production_faithful"
    | "poster_production"
    | "arlite_not_copy";
  label: string;
  status: LifecycleGateStatus;
  summary: string;
  detail: string;
  evidenceLinks: Owner3dEvidenceLink[];
};

export type Owner3dAuditAction =
  | "generated"
  | "visual_approved"
  | "device_qa_passed"
  | "device_qa_failed"
  | "cdn_validated"
  | "finalized"
  | "publish_requested"
  | "published"
  | "rollback_requested"
  | "rolled_back";

export type Owner3dAuditEvent = {
  id: string;
  source:
    | "publish_event"
    | "visual_review"
    | "device_qa"
    | "pipeline_job"
    | "manifest_lifecycle"
    | "report_fallback";
  persisted: boolean;
  actor: {
    clerkUserId?: string;
    email?: string;
    name?: string;
    label: string;
  };
  action: Owner3dAuditAction;
  oldState: string | null;
  newState: string | null;
  timestamp: string;
  reason?: string;
  evidenceLinks: Owner3dEvidenceLink[];
};

export type Owner3dLifecycleState = {
  identity: SourceUploadIdentity;
  manifestPresent: boolean;
  manifestPath: string | null;
  reportDirectory: string | null;
  currentState: string;
  lifecyclePhase: string;
  finalizedAt: string | null;
  publishedAt: string | null;
  gates: Owner3dLifecycleGate[];
  canFinalize: boolean;
  finalizeDisabledReason: string;
  canPublish: boolean;
  publishDisabledReason: string;
  finalizationCommand: string;
  publishCommand: string;
  rollbackCommandTemplate: string;
  confirmations: {
    finalize: string;
    publish: string;
    rollbackPrefix: string;
  };
  effects: {
    finalizePublishes: false;
    publishWritesActiveVersion: true;
    publishRefreshesRestaurantManifest: true;
    publishDeletesPrevious: false;
    rollbackDeletesPrevious: false;
    rollbackCreatesEvent: true;
  };
  auditEvents: Owner3dAuditEvent[];
};

export type Owner3dLifecycleInput = {
  identity: SourceUploadIdentity;
  manifest: unknown;
  source: "manifest" | "report" | "demo-fallback";
  manifestPath: string | null;
  reportDirectory: string | null;
  visualReport?: unknown;
  cdn: CdnWorkflowState;
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectValue(value: unknown): JsonObject | null {
  return isObject(value) ? value : null;
}

function stringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function validIsoDate(value: unknown): boolean {
  const raw = stringValue(value);
  return Boolean(raw) && !Number.isNaN(new Date(raw).getTime());
}

function validSha(value: unknown): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function identityKey(identity: SourceUploadIdentity): string {
  return `${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}@${identity.version}`;
}

export function lifecyclePublishConfirmation(identity: SourceUploadIdentity): string {
  return `PUBLISH ${identityKey(identity)}`;
}

export function lifecycleFinalizeConfirmation(identity: SourceUploadIdentity): string {
  return `FINALIZE ${identityKey(identity)}`;
}

export function lifecycleRollbackConfirmation(
  identity: SourceUploadIdentity,
  targetVersion: string
): string {
  return `ROLLBACK ${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug} TO ${targetVersion}`;
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

function lifecycleCommands(identity: SourceUploadIdentity) {
  const manifest = manifestPath(identity);
  const reports = reportsPath(identity);
  return {
    finalize: `npm run 3d:finalize-manifest -- --manifest ${manifest} --network-validation-report ${reports}/network-validation.json --write`,
    publish: `npm run 3d:publish -- --manifest ${manifest} --network-validation-report ${reports}/network-validation.json --quality-approved --approved-by "<owner>" --write`,
    rollback: `npm run 3d:rollback -- --restaurant ${identity.restaurantSlug} --menu ${identity.menuSlug} --dish ${identity.dishSlug} --to <previous-version> --approved-by "<owner>" --write`,
    rollbackFor(targetVersion: string) {
      return `npm run 3d:rollback -- --restaurant ${identity.restaurantSlug} --menu ${identity.menuSlug} --dish ${identity.dishSlug} --to ${targetVersion} --approved-by "<owner>" --write`;
    }
  };
}

function gate(args: Omit<Owner3dLifecycleGate, "evidenceLinks"> & {
  evidenceLinks?: Owner3dEvidenceLink[];
}): Owner3dLifecycleGate {
  return {
    ...args,
    evidenceLinks: sanitizeEvidenceLinks(args.evidenceLinks ?? [])
  };
}

function allPassed(gates: Owner3dLifecycleGate[]): boolean {
  return gates.every((item) => item.status === "passed");
}

function firstBlocker(gates: Owner3dLifecycleGate[]): string {
  return (
    gates.find((item) => item.status !== "passed")?.summary ||
    "All lifecycle gates passed."
  );
}

function visualReportGate(args: {
  manifest: JsonObject | null;
  visualReport?: unknown;
  reportDirectory: string | null;
}): Owner3dLifecycleGate {
  const visualQuality = objectValue(args.manifest?.visualQuality);
  const report = objectValue(args.visualReport);
  const hasReportReference = Boolean(visualQuality?.report || report);
  const artifacts = objectValue(visualQuality?.reportArtifacts);
  const hasTriplets = ["web", "mobile", "arLite"].every((variant) => {
    const triplet = objectValue(artifacts?.[variant]);
    return Boolean(triplet?.before && triplet?.after && triplet?.diff);
  });

  if (!args.manifest) {
    return gate({
      id: "visual_report",
      label: "Visual report passed",
      status: "missing",
      summary: "No manifest is available.",
      detail: "Finalize requires a version manifest with strict visual evidence."
    });
  }
  if (visualQuality?.status !== "passed") {
    return gate({
      id: "visual_report",
      label: "Visual report passed",
      status: "failed",
      summary: "visualQuality.status is not passed.",
      detail: `Current value: ${stringValue(visualQuality?.status, "missing")}.`
    });
  }
  if (!hasReportReference) {
    return gate({
      id: "visual_report",
      label: "Visual report passed",
      status: "missing",
      summary: "Visual report evidence is missing.",
      detail: "A passed visual status without a report cannot unlock finalize."
    });
  }
  if (!hasTriplets) {
    return gate({
      id: "visual_report",
      label: "Visual report passed",
      status: "warning",
      summary: "Before/after/diff artifacts are incomplete.",
      detail: "The CLI requires rendered evidence for web, mobile and arLite."
    });
  }

  return gate({
    id: "visual_report",
    label: "Visual report passed",
    status: "passed",
    summary: "Strict rendered visual report is present.",
    detail: "Source, selected candidate and diff evidence are bound to the manifest.",
    evidenceLinks: [
      {
        label: "Visual report",
        path: stringValue(visualQuality.report, args.reportDirectory ? `${args.reportDirectory}/visual-report.json` : "")
      }
    ]
  });
}

function humanApprovalGate(manifest: JsonObject | null): Owner3dLifecycleGate {
  const visualQuality = objectValue(manifest?.visualQuality);
  const visualReview = objectValue(visualQuality?.manualReview);
  const quality = objectValue(manifest?.quality);
  const qualityReview = objectValue(quality?.manualReview);
  const approvedBy =
    stringValue(qualityReview?.approvedBy) ||
    stringValue(visualReview?.approvedBy) ||
    stringValue(quality?.approvedBy);
  const approvedAt = stringValue(qualityReview?.approvedAt) || stringValue(visualReview?.approvedAt);

  const ok =
    quality?.manualVisualApproved === true &&
    qualityReview?.status === "approved" &&
    visualReview?.status === "approved" &&
    approvedBy.length > 0 &&
    validIsoDate(approvedAt);

  return gate({
    id: "human_approval",
    label: "Human approval passed",
    status: ok ? "passed" : "missing",
    summary: ok ? `Approved by ${approvedBy}.` : "Human approval is incomplete.",
    detail: ok
      ? `Approved at ${approvedAt}.`
      : "quality.manualReview and visualQuality.manualReview must both be approved by a human reviewer.",
    evidenceLinks: ok
      ? [
          {
            label: "Human approval",
            path: stringValue(visualQuality?.report)
          }
        ]
      : []
  });
}

function deviceEntryOk(entry: JsonObject | null): boolean {
  const evidence = objectValue(entry?.evidence);
  return Boolean(
    entry?.required === true &&
      entry.status === "passed" &&
      stringValue(entry.device).length > 0 &&
      stringValue(entry.os).length > 0 &&
      stringValue(entry.testedBy).length > 0 &&
      validIsoDate(entry.testedAt) &&
      evidence &&
      validSha(evidence.sha256) &&
      numberValue(evidence.bytes) > 0 &&
      Boolean(evidence.path || evidence.url || evidence.storagePath)
  );
}

function deviceGate(manifest: JsonObject | null, target: "iphoneQuickLook" | "androidSceneViewer"): Owner3dLifecycleGate {
  const qualityQa = objectValue(objectValue(manifest?.quality)?.realDeviceQa);
  const visualQa = objectValue(objectValue(manifest?.visualQuality)?.realDeviceQa);
  const qualityEntry = objectValue(qualityQa?.[target]);
  const visualEntry = objectValue(visualQa?.[target]);
  const ok = qualityQa?.required === true && visualQa?.required === true && deviceEntryOk(qualityEntry) && deviceEntryOk(visualEntry);
  const label = target === "iphoneQuickLook" ? "iPhone QA passed" : "Android QA passed";
  const evidence = objectValue(qualityEntry?.evidence);

  return gate({
    id: target === "iphoneQuickLook" ? "iphone_qa" : "android_qa",
    label,
    status: ok ? "passed" : "missing",
    summary: ok
      ? `${target === "iphoneQuickLook" ? "Quick Look" : "Scene Viewer"} evidence recorded.`
      : `${target === "iphoneQuickLook" ? "Quick Look" : "Scene Viewer"} evidence is incomplete.`,
    detail: ok
      ? `${stringValue(qualityEntry?.device)} / ${stringValue(qualityEntry?.os)} by ${stringValue(qualityEntry?.testedBy)}.`
      : "Both quality.realDeviceQa and visualQuality.realDeviceQa must show a real passed device test with evidence.",
    evidenceLinks: ok
      ? [
          {
            label,
            path: stringValue(evidence?.path || evidence?.storagePath),
            url: stringValue(evidence?.url),
            sha256: stringValue(evidence?.sha256),
            bytes: numberValue(evidence?.bytes),
            private: Boolean(evidence?.storagePath)
          }
        ]
      : []
  });
}

function cdnOrLocalGate(manifest: JsonObject | null, cdn: CdnWorkflowState): Owner3dLifecycleGate {
  if (!manifest) {
    return gate({
      id: "cdn_or_local",
      label: "CDN/local validation passed",
      status: "missing",
      summary: "No manifest delivery targets are available.",
      detail: "Finalize requires either strict CDN validation or CLI local file validation."
    });
  }

  if (cdn.requiresNetworkValidation) {
    const ok = cdn.readyToFinalize && cdn.networkReportOk && cdn.uploadPlanCurrent;
    return gate({
      id: "cdn_or_local",
      label: "CDN/local validation passed",
      status: ok ? "passed" : "missing",
      summary: ok ? "CDN network report passed." : cdn.blockReason || "CDN network validation is required.",
      detail: ok
        ? "Fetched bytes, hashes, MIME, cache, USDZ inline and CORS match the manifest."
        : "Upload plan alone is not enough to finalize an external CDN manifest.",
      evidenceLinks: ok
        ? [
            { label: "Upload plan", path: cdn.uploadPlanPath },
            { label: "Network report", path: cdn.networkReportPath }
          ]
        : []
    });
  }

  const locallyApproved =
    manifest.validationStatus === "passed" &&
    arrayValue(objectValue(manifest.validation)?.fails).length === 0 &&
    arrayValue(objectValue(manifest.validation)?.warnings).length === 0;

  return gate({
    id: "cdn_or_local",
    label: "CDN/local validation passed",
    status: locallyApproved ? "passed" : "warning",
    summary: locallyApproved
      ? "Local runtime manifest is already validated."
      : "Local file validation still belongs to the CLI preflight.",
    detail: locallyApproved
      ? "validationStatus is passed and no validation messages are present."
      : "The dashboard will not invent local file hash validation without the finalize/publish CLI preflight."
  });
}

function noWarningsGate(manifest: JsonObject | null): Owner3dLifecycleGate {
  const validation = objectValue(manifest?.validation);
  const warnings = arrayValue(validation?.warnings);
  const fails = arrayValue(validation?.fails);
  const failed = manifest?.validationStatus === "failed" || fails.length > 0;
  const warning = manifest?.validationStatus === "warning" || warnings.length > 0;

  return gate({
    id: "no_warnings",
    label: "No warnings/fails",
    status: failed ? "failed" : warning ? "warning" : "passed",
    summary: failed
      ? `${fails.length || 1} validation fail(s) present.`
      : warning
        ? `${warnings.length || 1} validation warning(s) present.`
        : "No validation warning or fail is present.",
    detail: failed || warning
      ? "Finalize/publish must wait until validation warnings and failures are resolved."
      : "The manifest validation message arrays are empty."
  });
}

function productionFaithfulGate(manifest: JsonObject | null): Owner3dLifecycleGate {
  const iosUsdz = objectValue(objectValue(manifest?.variants)?.iosUsdz);
  const ok = iosUsdz?.productionFaithful === true && iosUsdz.proxy !== true;
  return gate({
    id: "production_faithful",
    label: "productionFaithful status",
    status: ok ? "passed" : "missing",
    summary: ok ? "USDZ is marked production faithful." : "USDZ productionFaithful is not certified.",
    detail: ok
      ? "Quick Look package is not a proxy and is marked as production faithful."
      : "variants.iosUsdz.productionFaithful must be true and proxy must not be true."
  });
}

function posterProductionGate(manifest: JsonObject | null): Owner3dLifecycleGate {
  const poster = objectValue(objectValue(manifest?.variants)?.poster);
  const ok = poster?.productionPoster === true && poster.placeholder !== true;
  return gate({
    id: "poster_production",
    label: "Poster production status",
    status: ok ? "passed" : "missing",
    summary: ok ? "Poster is production approved." : "Poster is not production approved.",
    detail: ok
      ? "The poster is not a placeholder and has production approval."
      : "variants.poster.productionPoster must be true and placeholder must not be true."
  });
}

function arLiteNotCopyGate(manifest: JsonObject | null): Owner3dLifecycleGate {
  const variants = objectValue(manifest?.variants);
  const arLite = objectValue(variants?.arLite);
  const sourceSha = stringValue(objectValue(manifest?.sourceAnalysis)?.sha256);
  const webSha = stringValue(objectValue(variants?.web)?.sha256);
  const mobileSha = stringValue(objectValue(variants?.mobile)?.sha256);
  const arLiteSha = stringValue(arLite?.sha256);
  const command = stringValue(objectValue(arLite?.optimizer)?.command);
  const extensionsRequired = arrayValue(arLite?.extensionsRequired);
  const externalUris = arrayValue(arLite?.externalUris);
  const copied =
    !arLite ||
    !arLiteSha ||
    arLite.optimizationMethod === "copy" ||
    /\bcopy\b/i.test(command) ||
    (sourceSha && arLiteSha === sourceSha) ||
    (webSha && arLiteSha === webSha) ||
    (mobileSha && arLiteSha === mobileSha) ||
    extensionsRequired.length > 0 ||
    externalUris.length > 0;

  return gate({
    id: "arlite_not_copy",
    label: "arLite not copy",
    status: copied ? "failed" : "passed",
    summary: copied ? "arLite still looks like a copy or unsafe GLB." : "arLite is distinct and AR-safe.",
    detail: copied
      ? "arLite must not copy source/web/mobile, must not use copy commands, and must not require GLB extensions or external URIs."
      : "The AR-lite hash and optimizer metadata are distinct from the source and richer runtime variants."
  });
}

function buildGates(args: Owner3dLifecycleInput, manifest: JsonObject | null): Owner3dLifecycleGate[] {
  return [
    visualReportGate({
      manifest,
      visualReport: args.visualReport,
      reportDirectory: args.reportDirectory
    }),
    humanApprovalGate(manifest),
    deviceGate(manifest, "iphoneQuickLook"),
    deviceGate(manifest, "androidSceneViewer"),
    cdnOrLocalGate(manifest, args.cdn),
    noWarningsGate(manifest),
    productionFaithfulGate(manifest),
    posterProductionGate(manifest),
    arLiteNotCopyGate(manifest)
  ];
}

function manifestEvidence(args: Owner3dLifecycleInput): Owner3dEvidenceLink[] {
  return [
    { label: "Version manifest", path: args.manifestPath ?? manifestPath(args.identity) },
    { label: "Network report", path: args.cdn.networkReportPath },
    { label: "Upload plan", path: args.cdn.uploadPlanPath }
  ];
}

function auditActor(value: unknown, fallback = "Manifest lifecycle"): Owner3dAuditEvent["actor"] {
  const label = stringValue(value, fallback);
  return { label, name: label === fallback ? undefined : label };
}

function cleanAuditId(parts: Array<string | null | undefined>): string {
  const bounded = parts.filter(Boolean).join(":").slice(0, 512);
  let cleaned = "";
  let replacementRun = false;

  for (let index = 0; index < bounded.length && cleaned.length < 240; index += 1) {
    const code = bounded.charCodeAt(index);
    const safe =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 45 ||
      code === 46 ||
      code === 47 ||
      code === 58 ||
      code === 64 ||
      code === 95;

    if (safe) {
      cleaned += bounded[index];
      replacementRun = false;
    } else if (!replacementRun) {
      cleaned += "-";
      replacementRun = true;
    }
  }

  return cleaned || "owner-3d-audit-event";
}

function eventId(parts: Array<string | null | undefined>): string {
  return cleanAuditId(parts);
}

export function createOwner3dLifecycleAuditEvent(args: {
  identity: SourceUploadIdentity;
  action: Owner3dAuditAction;
  actorLabel: string;
  oldState: string | null;
  newState: string | null;
  timestamp: string;
  reason?: string;
  evidenceLinks?: Owner3dEvidenceLink[];
  persisted?: boolean;
  source?: Owner3dAuditEvent["source"];
}): Owner3dAuditEvent {
  return {
    id: eventId([args.action, identityKey(args.identity), args.timestamp]),
    source: args.source ?? "manifest_lifecycle",
    persisted: args.persisted ?? false,
    actor: auditActor(args.actorLabel),
    action: args.action,
    oldState: args.oldState,
    newState: args.newState,
    timestamp: args.timestamp,
    reason: args.reason,
    evidenceLinks: sanitizeEvidenceLinks(args.evidenceLinks ?? [])
  };
}

function buildAuditEvents(args: Owner3dLifecycleInput, manifest: JsonObject | null): Owner3dAuditEvent[] {
  if (!manifest || args.source !== "manifest") return [];

  const identity = args.identity;
  const lifecycle = objectValue(manifest.lifecycle);
  const visualQuality = objectValue(manifest.visualQuality);
  const visualReview = objectValue(visualQuality?.manualReview);
  const quality = objectValue(manifest.quality);
  const qualityQa = objectValue(quality?.realDeviceQa);
  const rollback = objectValue(manifest.rollback);
  const events: Owner3dAuditEvent[] = [];

  const generatedAt = stringValue(lifecycle?.generatedAt, stringValue(manifest.generatedAt));
  if (validIsoDate(generatedAt)) {
    events.push(
      createOwner3dLifecycleAuditEvent({
        identity,
        action: "generated",
        actorLabel: stringValue(lifecycle?.generatedBy, "Pipeline CLI"),
        oldState: null,
        newState: stringValue(lifecycle?.phase, stringValue(manifest.status)),
        timestamp: generatedAt,
        evidenceLinks: manifestEvidence(args)
      })
    );
  }

  const approvedAt = stringValue(visualReview?.approvedAt);
  if (visualReview?.status === "approved" && validIsoDate(approvedAt)) {
    events.push(
      createOwner3dLifecycleAuditEvent({
        identity,
        action: "visual_approved",
        actorLabel: stringValue(visualReview?.approvedBy, stringValue(quality?.approvedBy, "Human reviewer")),
        oldState: "needs_visual_review",
        newState: "visual_approved",
        timestamp: approvedAt,
        evidenceLinks: [
          { label: "Visual report", path: stringValue(visualQuality?.report) }
        ]
      })
    );
  }

  for (const target of ["iphoneQuickLook", "androidSceneViewer"] as const) {
    const entry = objectValue(qualityQa?.[target]);
    const testedAt = stringValue(entry?.testedAt);
    if ((entry?.status === "passed" || entry?.status === "failed") && validIsoDate(testedAt)) {
      const evidence = objectValue(entry.evidence);
      events.push(
        createOwner3dLifecycleAuditEvent({
          identity,
          action: entry.status === "passed" ? "device_qa_passed" : "device_qa_failed",
          actorLabel: stringValue(entry.testedBy, "Device QA reviewer"),
          oldState: "device_qa_pending",
          newState: `${target}:${entry.status}`,
          timestamp: testedAt,
          evidenceLinks: [
            {
              label: target === "iphoneQuickLook" ? "iPhone evidence" : "Android evidence",
              path: stringValue(evidence?.path || evidence?.storagePath),
              url: stringValue(evidence?.url),
              sha256: stringValue(evidence?.sha256),
              bytes: numberValue(evidence?.bytes),
              private: Boolean(evidence?.storagePath)
            }
          ]
        })
      );
    }
  }

  if (args.cdn.networkReportOk && args.cdn.networkReportSummary) {
    const generatedAt = stringValue(args.cdn.uploadPlanGeneratedAt, stringValue(lifecycle?.finalizedAt));
    if (validIsoDate(generatedAt)) {
      events.push(
        createOwner3dLifecycleAuditEvent({
          identity,
          action: "cdn_validated",
          actorLabel: "Network validator",
          oldState: "needs_cdn_upload",
          newState: "cdn_validated",
          timestamp: generatedAt,
          source: "report_fallback",
          evidenceLinks: [
            { label: "Network report", path: args.cdn.networkReportPath },
            { label: "Upload plan", path: args.cdn.uploadPlanPath }
          ]
        })
      );
    }
  }

  const finalizedAt = stringValue(lifecycle?.finalizedAt);
  if (validIsoDate(finalizedAt)) {
    events.push(
      createOwner3dLifecycleAuditEvent({
        identity,
        action: "finalized",
        actorLabel: stringValue(quality?.approvedBy, "Pipeline CLI"),
        oldState: "review",
        newState: "approved",
        timestamp: finalizedAt,
        evidenceLinks: manifestEvidence(args)
      })
    );
  }

  const publishedAt = stringValue(lifecycle?.publishedAt, stringValue(manifest.publishedAt));
  if (validIsoDate(publishedAt)) {
    events.push(
      createOwner3dLifecycleAuditEvent({
        identity,
        action: "published",
        actorLabel: stringValue(lifecycle?.publishedBy, stringValue(quality?.publishedBy, "Owner")),
        oldState: "approved",
        newState: "published",
        timestamp: publishedAt,
        evidenceLinks: manifestEvidence(args)
      })
    );
  }

  const rollbackAt = stringValue(lifecycle?.rollbackAt);
  if (validIsoDate(rollbackAt)) {
    const fromVersion = stringValue(rollback?.fromVersion);
    events.push(
      createOwner3dLifecycleAuditEvent({
        identity,
        action: "rolled_back",
        actorLabel: stringValue(lifecycle?.rollbackBy, "Owner"),
        oldState: fromVersion || null,
        newState: stringValue(rollback?.toVersion, identity.version),
        timestamp: rollbackAt,
        evidenceLinks: manifestEvidence(args)
      })
    );
  }

  return events.sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}

function strictManifestBlocker(manifest: JsonObject | null, source: Owner3dLifecycleInput["source"]): string {
  if (!manifest || source !== "manifest") return "A production version manifest is required.";
  if (manifest.schemaVersion !== 2) return "schemaVersion 2 is required.";
  if (manifest.status === "published" || manifest.status === "archived") {
    return "Published or archived manifests cannot be finalized again.";
  }
  if (manifest.status === "approved") return "Manifest is already finalized.";
  if (manifest.publishedAt !== null) {
    return "publishedAt must be explicitly null before finalize.";
  }
  if (objectValue(manifest.lifecycle)?.publishedAt || objectValue(manifest.lifecycle)?.publishedBy || objectValue(manifest.quality)?.publishedBy) {
    return "Publish lifecycle fields already exist.";
  }
  return "";
}

function publishBlocker(args: {
  manifest: JsonObject | null;
  source: Owner3dLifecycleInput["source"];
  gates: Owner3dLifecycleGate[];
}): string {
  const { manifest, source, gates } = args;
  if (!manifest || source !== "manifest") return "A finalized production manifest is required.";
  if (manifest.schemaVersion !== 2) return "schemaVersion 2 is required.";
  if (manifest.status !== "approved") return "Publish requires status approved.";
  if (manifest.validationStatus !== "passed") return "Publish requires validationStatus passed.";
  if (!validIsoDate(manifest.approvedAt)) return "Publish requires approvedAt.";
  if (!validIsoDate(objectValue(manifest.lifecycle)?.finalizedAt)) {
    return "Publish requires a finalized lifecycle timestamp.";
  }
  if (manifest.publishedAt !== null) return "Publish refuses an already published manifest.";
  if (!allPassed(gates)) return firstBlocker(gates);
  return "";
}

export function buildOwner3dLifecycleState(args: Owner3dLifecycleInput): Owner3dLifecycleState {
  const manifest = objectValue(args.manifest);
  const gates = buildGates(args, manifest);
  const commands = lifecycleCommands(args.identity);
  const strictBlocker = strictManifestBlocker(manifest, args.source);
  const canFinalize = !strictBlocker && allPassed(gates);
  const publishDisabledReason = publishBlocker({ manifest, source: args.source, gates });

  return {
    identity: args.identity,
    manifestPresent: Boolean(manifest),
    manifestPath: args.manifestPath,
    reportDirectory: args.reportDirectory,
    currentState: stringValue(manifest?.status, args.source === "demo-fallback" ? "demo-fallback" : "unavailable"),
    lifecyclePhase: stringValue(objectValue(manifest?.lifecycle)?.phase, stringValue(manifest?.status, "unavailable")),
    finalizedAt: stringValue(objectValue(manifest?.lifecycle)?.finalizedAt) || null,
    publishedAt: stringValue(objectValue(manifest?.lifecycle)?.publishedAt, stringValue(manifest?.publishedAt)) || null,
    gates,
    canFinalize,
    finalizeDisabledReason: canFinalize ? "" : strictBlocker || firstBlocker(gates),
    canPublish: !publishDisabledReason,
    publishDisabledReason,
    finalizationCommand: commands.finalize,
    publishCommand: commands.publish,
    rollbackCommandTemplate: commands.rollback,
    confirmations: {
      finalize: lifecycleFinalizeConfirmation(args.identity),
      publish: lifecyclePublishConfirmation(args.identity),
      rollbackPrefix: `ROLLBACK ${args.identity.restaurantSlug}/${args.identity.menuSlug}/${args.identity.dishSlug} TO `
    },
    effects: {
      finalizePublishes: false,
      publishWritesActiveVersion: true,
      publishRefreshesRestaurantManifest: true,
      publishDeletesPrevious: false,
      rollbackDeletesPrevious: false,
      rollbackCreatesEvent: true
    },
    auditEvents: buildAuditEvents(args, manifest)
  };
}

export function validateLifecycleConfirmation(args: {
  action: "finalize" | "publish" | "rollback";
  state: Owner3dLifecycleState;
  typed: string;
  targetVersion?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const typed = args.typed.trim();
  if (args.action === "finalize") {
    if (!args.state.canFinalize) return { ok: false, error: args.state.finalizeDisabledReason };
    return typed === args.state.confirmations.finalize
      ? { ok: true }
      : { ok: false, error: `Type ${args.state.confirmations.finalize} to unlock finalize.` };
  }
  if (args.action === "publish") {
    if (!args.state.canPublish) return { ok: false, error: args.state.publishDisabledReason };
    return typed === args.state.confirmations.publish
      ? { ok: true }
      : { ok: false, error: `Type ${args.state.confirmations.publish} to unlock publish.` };
  }

  const targetVersion = stringValue(args.targetVersion);
  if (!targetVersion || targetVersion === args.state.identity.version) {
    return { ok: false, error: "Choose a previous version before rollback." };
  }
  const expected = lifecycleRollbackConfirmation(args.state.identity, targetVersion);
  return typed === expected
    ? { ok: true }
    : { ok: false, error: `Type ${expected} to unlock rollback.` };
}

function safeEvidencePath(path: string): string {
  const normalized = path.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.includes("..") ||
    !/^(assets\/3d\/reports\/|assets\/3d\/source\/|public\/models\/restaurants\/)/.test(normalized)
  ) {
    return "";
  }
  return normalized;
}

function safeEvidenceUrl(url: string): string {
  if (!url.trim()) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

export function sanitizeEvidenceLinks(links: Owner3dEvidenceLink[]): Owner3dEvidenceLink[] {
  return links
    .map((link) => {
      const path = link.path ? safeEvidencePath(link.path) : "";
      const url = link.url ? safeEvidenceUrl(link.url) : "";
      return {
        label: stringValue(link.label, "Evidence").slice(0, 120),
        ...(path ? { path } : {}),
        ...(url ? { url } : {}),
        ...(validSha(link.sha256) ? { sha256: stringValue(link.sha256) } : {}),
        ...(numberValue(link.bytes) > 0 ? { bytes: numberValue(link.bytes) } : {}),
        ...(link.mimeType ? { mimeType: stringValue(link.mimeType).slice(0, 120) } : {}),
        ...(link.private ? { private: true } : {})
      };
    })
    .filter((link) => link.path || link.url || link.label)
    .slice(0, 12);
}

export function rollbackCommandForTarget(
  identity: SourceUploadIdentity,
  targetVersion: string
): string {
  return lifecycleCommands(identity).rollbackFor(targetVersion);
}
