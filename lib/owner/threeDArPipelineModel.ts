export type PipelineStatusId =
  | "source_uploaded"
  | "running"
  | "needs_review"
  | "rejected"
  | "ready_to_finalize"
  | "ready_to_publish"
  | "published";

export type PipelineStatusTone = "ready" | "warn" | "danger" | "muted";

export type PipelineAssetSource = "manifest" | "report" | "demo-fallback";

export type PipelineOverviewCard = {
  id: PipelineStatusId;
  label: string;
  tone: PipelineStatusTone;
};

export type PipelineActionId =
  | "upload_source"
  | "run_analyze"
  | "run_optimize"
  | "run_visual_compare"
  | "approve_visual"
  | "record_device_qa"
  | "prepare_cdn"
  | "finalize"
  | "publish"
  | "rollback";

export type PipelineActionSpec = {
  id: PipelineActionId;
  label: string;
  confirmationRequired: boolean;
  destructive: boolean;
  executesInUi: false;
};

type PipelineManifestLike = {
  status?: string;
  validationStatus?: string;
  visualQuality?: {
    status?: string;
    manualReview?: {
      status?: string;
    };
  };
  quality?: {
    manualVisualApproved?: boolean;
    manualReview?: {
      status?: string;
    };
    realDeviceQa?: RealDeviceQaLike;
  };
  validation?: {
    warnings?: unknown[];
    fails?: unknown[];
  };
};

type CandidateReportLike = {
  selectedCandidate?: string | null;
  decision?: {
    status?: string;
    reason?: string;
  };
};

type DeviceQaEntryLike = {
  required?: boolean;
  status?: string;
  device?: string;
  os?: string;
  testedBy?: string;
  testedAt?: string | null;
  evidence?: {
    sha256?: string;
    bytes?: number;
    path?: string;
    url?: string;
    storagePath?: string;
  };
};

type RealDeviceQaLike = {
  required?: boolean;
  iphoneQuickLook?: DeviceQaEntryLike;
  androidSceneViewer?: DeviceQaEntryLike;
};

export type PipelineStatusInput = {
  manifest?: PipelineManifestLike | null;
  candidateReport?: CandidateReportLike | null;
  hasSourceAnalysis?: boolean;
  hasRunningReport?: boolean;
  requiresCdnValidation?: boolean;
  hasPassingCdnValidation?: boolean;
};

export const PIPELINE_OVERVIEW_CARDS: PipelineOverviewCard[] = [
  { id: "source_uploaded", label: "Sources uploaded", tone: "muted" },
  { id: "running", label: "Running", tone: "warn" },
  { id: "needs_review", label: "Needs review", tone: "warn" },
  { id: "rejected", label: "Rejected", tone: "danger" },
  { id: "ready_to_finalize", label: "Ready to finalize", tone: "warn" },
  { id: "ready_to_publish", label: "Ready to publish", tone: "ready" },
  { id: "published", label: "Published", tone: "ready" }
];

export const PIPELINE_ACTIONS: PipelineActionSpec[] = [
  {
    id: "upload_source",
    label: "Upload source",
    confirmationRequired: false,
    destructive: false,
    executesInUi: false
  },
  {
    id: "run_analyze",
    label: "Run analyze",
    confirmationRequired: false,
    destructive: false,
    executesInUi: false
  },
  {
    id: "run_optimize",
    label: "Run optimize",
    confirmationRequired: false,
    destructive: false,
    executesInUi: false
  },
  {
    id: "run_visual_compare",
    label: "Run visual compare",
    confirmationRequired: false,
    destructive: false,
    executesInUi: false
  },
  {
    id: "approve_visual",
    label: "Approve visual",
    confirmationRequired: true,
    destructive: false,
    executesInUi: false
  },
  {
    id: "record_device_qa",
    label: "Record device QA",
    confirmationRequired: false,
    destructive: false,
    executesInUi: false
  },
  {
    id: "prepare_cdn",
    label: "Prepare CDN",
    confirmationRequired: false,
    destructive: false,
    executesInUi: false
  },
  {
    id: "finalize",
    label: "Finalize",
    confirmationRequired: true,
    destructive: false,
    executesInUi: false
  },
  {
    id: "publish",
    label: "Publish",
    confirmationRequired: true,
    destructive: true,
    executesInUi: false
  },
  {
    id: "rollback",
    label: "Rollback",
    confirmationRequired: true,
    destructive: true,
    executesInUi: false
  }
];

const STATUS_BY_ID = new Map(
  PIPELINE_OVERVIEW_CARDS.map((card) => [card.id, card])
);

export function statusCard(id: PipelineStatusId): PipelineOverviewCard {
  return STATUS_BY_ID.get(id) ?? PIPELINE_OVERVIEW_CARDS[2];
}

function hasPassedDeviceQa(realDeviceQa?: RealDeviceQaLike): boolean {
  const hasEvidence = (entry?: DeviceQaEntryLike) =>
    Boolean(
      entry?.evidence &&
        typeof entry.evidence.sha256 === "string" &&
        /^[a-f0-9]{64}$/i.test(entry.evidence.sha256) &&
        Number.isFinite(entry.evidence.bytes) &&
        Number(entry.evidence.bytes) > 0 &&
        Boolean(entry.evidence.path || entry.evidence.url || entry.evidence.storagePath)
    );
  const hasRequiredMetadata = (entry?: DeviceQaEntryLike) =>
    Boolean(
      entry?.required === true &&
        entry.device?.trim() &&
        entry.os?.trim() &&
        entry.testedBy?.trim() &&
        entry.testedAt &&
        !Number.isNaN(new Date(entry.testedAt).getTime())
    );

  return (
    realDeviceQa?.required === true &&
    realDeviceQa?.iphoneQuickLook?.status === "passed" &&
    hasRequiredMetadata(realDeviceQa.iphoneQuickLook) &&
    hasEvidence(realDeviceQa.iphoneQuickLook) &&
    realDeviceQa?.androidSceneViewer?.status === "passed" &&
    hasRequiredMetadata(realDeviceQa.androidSceneViewer) &&
    hasEvidence(realDeviceQa.androidSceneViewer)
  );
}

function hasValidationMessages(manifest: PipelineManifestLike): boolean {
  return (
    (manifest.validation?.fails?.length ?? 0) > 0 ||
    (manifest.validation?.warnings?.length ?? 0) > 0
  );
}

function hasValidationFailure(manifest: PipelineManifestLike): boolean {
  return (
    manifest.validationStatus === "failed" ||
    (manifest.validation?.fails?.length ?? 0) > 0
  );
}

function hasManualApproval(manifest: PipelineManifestLike): boolean {
  return (
    manifest.quality?.manualVisualApproved === true ||
    manifest.quality?.manualReview?.status === "approved" ||
    manifest.visualQuality?.manualReview?.status === "approved"
  );
}

function hasFinalizeManualApproval(manifest: PipelineManifestLike): boolean {
  return (
    manifest.quality?.manualVisualApproved === true &&
    manifest.quality?.manualReview?.status === "approved" &&
    manifest.visualQuality?.manualReview?.status === "approved"
  );
}

export function resolvePipelineStatus(
  input: PipelineStatusInput
): PipelineOverviewCard {
  const manifest = input.manifest ?? null;
  const candidateReport = input.candidateReport ?? null;

  if (
    manifest?.status === "published" &&
    manifest.validationStatus === "passed" &&
    !hasValidationMessages(manifest)
  ) {
    return statusCard("published");
  }

  if (
    manifest?.status === "approved" &&
    manifest.validationStatus === "passed" &&
    !hasValidationMessages(manifest) &&
    hasFinalizeManualApproval(manifest) &&
    hasPassedDeviceQa(manifest.quality?.realDeviceQa) &&
    (!input.requiresCdnValidation || input.hasPassingCdnValidation)
  ) {
    return statusCard("ready_to_publish");
  }

  if (manifest) {
    const noCandidate =
      candidateReport?.selectedCandidate === null ||
      candidateReport?.decision?.status === "rejected";
    const visualFailed = manifest.visualQuality?.status === "failed";

    if (
      noCandidate ||
      (visualFailed &&
        !hasManualApproval(manifest) &&
        manifest.visualQuality?.status !== "passed")
    ) {
      return statusCard("rejected");
    }

    if (hasValidationFailure(manifest)) {
      return statusCard("needs_review");
    }

    if (
      manifest.visualQuality?.status === "passed" &&
      hasFinalizeManualApproval(manifest) &&
      hasPassedDeviceQa(manifest.quality?.realDeviceQa) &&
      !hasValidationMessages(manifest) &&
      (!input.requiresCdnValidation || input.hasPassingCdnValidation)
    ) {
      return statusCard("ready_to_finalize");
    }

    if (manifest.validationStatus === "warning" || hasValidationMessages(manifest)) {
      return statusCard("needs_review");
    }

    return statusCard("needs_review");
  }

  if (input.hasRunningReport) {
    return statusCard("running");
  }

  if (input.hasSourceAnalysis) {
    return statusCard("source_uploaded");
  }

  return statusCard("needs_review");
}

export function pipelineStatusNextAction(status: PipelineStatusId): string {
  if (status === "source_uploaded") return "Run analyze";
  if (status === "running") return "Attendre la fin du rapport puis relire les preuves";
  if (status === "rejected") return "Run optimize";
  if (status === "ready_to_finalize") return "Finalize";
  if (status === "ready_to_publish") return "Publish";
  if (status === "published") return "Surveiller, puis Rollback seulement si nécessaire";
  return "Run visual compare";
}

export function shouldPreserveDemoFallbackAssets(
  assets: Array<{ source: PipelineAssetSource; status: PipelineStatusId }>
): boolean {
  const nonFallbackAssets = assets.filter((asset) => asset.source !== "demo-fallback");
  return (
    nonFallbackAssets.length > 0 &&
    nonFallbackAssets.every((asset) => asset.source === "manifest" && asset.status === "rejected")
  );
}

export function formatPipelineBytes(value: unknown): string {
  const bytes = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (bytes <= 0) return "Non disponible";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
