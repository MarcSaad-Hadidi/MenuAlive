import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOwner3dRestaurantAccess,
  owner3dAccessDeniedMessage
} from "@/lib/auth/owner3dAccess";
import {
  buildFallbackPipelineJobs,
  createPipelineJobDraft,
  hydratePipelineJobObservability,
  sanitizePipelineLogLine,
  transitionJobStatus,
  type PipelineJob,
  type PipelineJobObservabilityMetrics,
  type PipelineJobIdentity,
  type PipelineJobQueue,
  type PipelineQualityStatus,
  type PipelineStepLog,
  type PipelineJobStatus,
  type PipelineJobStep
} from "@/lib/owner/threeDJobsModel";
import { getOwner3dPipelineOverview } from "@/lib/owner/threeDArPipeline";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const JOBS_TABLE = "owner_3d_pipeline_jobs";
const SOURCE_UPLOADS_TABLE = "owner_3d_ar_source_uploads";
const ACTIVE_DEDUPE_STATUSES: PipelineJobStatus[] = [
  "queued",
  "running",
  "analyzing",
  "optimizing",
  "visual_comparing"
];

type OwnerIdentity = {
  userId: string;
  emailAddresses: string[];
};

type PipelineJobRow = {
  id: string;
  restaurant_slug: string;
  menu_slug: string;
  dish_slug: string;
  asset_version: string;
  step: PipelineJobStep;
  status: PipelineJobStatus;
  started_at: string | null;
  finished_at: string | null;
  logs: unknown;
  step_logs: unknown;
  artifacts: unknown;
  metrics: unknown;
  quality_status: PipelineQualityStatus | null;
  duration_ms: number | null;
  error_count: number | null;
  error_message: string | null;
  source_upload_id?: string | null;
  initiated_by_clerk_user_id: string;
  initiated_by_email: string | null;
  next_action: string;
  manual_runner_command: string;
  created_at: string;
  updated_at: string;
};

type JobStoreFailure = {
  ok: false;
  code:
    | "restaurant_access_denied"
    | "job_store_not_configured"
    | "invalid_transition"
    | "job_not_found"
    | "job_store_unavailable";
  message: string;
  status: 400 | 403 | 404 | 409 | 503;
};

type JobStoreSuccess<T> = {
  ok: true;
  configured: boolean;
  value: T;
};

function getAdminClient(): { ok: true; client: SupabaseClient } | JobStoreFailure {
  const admin = getSupabaseAdminClient();
  if (!admin.ok) {
    return {
      ok: false,
      code: "job_store_not_configured",
      message: "job store not configured",
      status: 503
    };
  }
  return { ok: true, client: admin.client };
}

function canUseDevFallback(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.VISTAIRE_OWNER_3D_JOBS_FALLBACK === "1"
  );
}

function safeRows(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map(sanitizePipelineLogLine)
        .filter(Boolean)
        .slice(0, 300)
    : [];
}

function safeStepLogs(value: unknown): PipelineStepLog[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is PipelineStepLog => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Record<string, unknown>;
      return typeof candidate.id === "string" && typeof candidate.step === "string";
    })
    .slice(0, 50);
}

function safeMetrics(value: unknown): PipelineJobObservabilityMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      sourceSizeBytes: null,
      selectedCandidateSizeBytes: null,
      reductionPercent: null,
      visualStatus: "not_run",
      candidatesRejected: 0,
      durationMs: null
    };
  }
  const candidate = value as Record<string, unknown>;
  return {
    sourceSizeBytes:
      typeof candidate.sourceSizeBytes === "number" ? candidate.sourceSizeBytes : null,
    selectedCandidateSizeBytes:
      typeof candidate.selectedCandidateSizeBytes === "number"
        ? candidate.selectedCandidateSizeBytes
        : null,
    reductionPercent:
      typeof candidate.reductionPercent === "number" ? candidate.reductionPercent : null,
    visualStatus:
      candidate.visualStatus === "passed" ||
      candidate.visualStatus === "failed" ||
      candidate.visualStatus === "missing" ||
      candidate.visualStatus === "warning"
        ? candidate.visualStatus
        : "not_run",
    candidatesRejected:
      typeof candidate.candidatesRejected === "number" ? candidate.candidatesRejected : 0,
    durationMs: typeof candidate.durationMs === "number" ? candidate.durationMs : null
  };
}

function qualityStatusFromRow(row: PipelineJobRow): PipelineQualityStatus {
  if (row.quality_status) return row.quality_status;
  if (
    row.status === "running" ||
    row.status === "analyzing" ||
    row.status === "optimizing" ||
    row.status === "visual_comparing"
  ) {
    return "running";
  }
  return row.status;
}

function safeArtifacts(value: unknown): PipelineJob["artifacts"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((artifact): artifact is PipelineJob["artifacts"][number] => {
      if (!artifact || typeof artifact !== "object") return false;
      const candidate = artifact as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.type === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.path === "string"
      );
    })
    .filter(
      (artifact) =>
        !artifact.path.includes("..") &&
        !artifact.path.includes("\\") &&
        /^(assets\/3d\/|public\/models\/restaurants\/|https:\/\/)/.test(artifact.path)
    )
    .slice(0, 50);
}

function rowToJob(row: PipelineJobRow): PipelineJob {
  const artifacts = safeArtifacts(row.artifacts);
  return hydratePipelineJobObservability({
    id: row.id,
    restaurantSlug: row.restaurant_slug,
    menuSlug: row.menu_slug,
    dishSlug: row.dish_slug,
    version: row.asset_version,
    step: row.step,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    logs: safeRows(row.logs),
    stepLogs: safeStepLogs(row.step_logs),
    artifacts,
    error: row.error_message ? sanitizePipelineLogLine(row.error_message) : null,
    initiatedBy: row.initiated_by_email ? "Owner operator" : row.initiated_by_clerk_user_id,
    nextAction: sanitizePipelineLogLine(row.next_action),
    manualRunnerCommand: sanitizePipelineLogLine(row.manual_runner_command),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    observability: {
      qualityStatus: qualityStatusFromRow(row),
      metrics: {
        ...safeMetrics(row.metrics),
        durationMs: row.duration_ms
      },
      errors: row.error_message ? [{ step: row.step, message: row.error_message }] : [],
      artifactRefs: artifacts
    }
  });
}

function jobToInsert(job: PipelineJob, owner: OwnerIdentity) {
  const dedupeKey = [
    job.restaurantSlug,
    job.menuSlug,
    job.dishSlug,
    job.version,
    job.step
  ].join(":");

  return {
    id: job.id,
    restaurant_slug: job.restaurantSlug,
    menu_slug: job.menuSlug,
    dish_slug: job.dishSlug,
    asset_version: job.version,
    step: job.step,
    status: job.status,
    started_at: job.startedAt,
    finished_at: job.finishedAt,
    logs: job.logs,
    step_logs: job.stepLogs,
    artifacts: job.artifacts,
    metrics: job.observability.metrics,
    quality_status: job.observability.qualityStatus,
    duration_ms: job.observability.metrics.durationMs,
    error_count: job.observability.errors.length,
    error_message: job.error,
    initiated_by_clerk_user_id: owner.userId,
    initiated_by_email: owner.emailAddresses[0] ?? null,
    next_action: job.nextAction,
    manual_runner_command: job.manualRunnerCommand,
    dedupe_key: dedupeKey
  };
}

async function findLatestRunnableSourceUploadId(
  client: SupabaseClient,
  identity: PipelineJobIdentity
): Promise<string | null> {
  const { data, error } = await client
    .from(SOURCE_UPLOADS_TABLE)
    .select("id,status")
    .eq("restaurant_slug", identity.restaurantSlug)
    .eq("menu_slug", identity.menuSlug)
    .eq("dish_slug", identity.dishSlug)
    .eq("version", identity.version)
    .in("status", [
      "source_uploaded",
      "analyzing",
      "analysis_failed",
      "analysis_complete",
      "optimized",
      "needs_review",
      "ready_to_finalize",
      "ready_to_publish"
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || typeof data.id !== "string") return null;
  return data.id;
}

function fallbackIdentities(): PipelineJobIdentity[] {
  const overview = getOwner3dPipelineOverview();
  return overview.assets.slice(0, 6).map((asset) => ({
    restaurantSlug: asset.restaurantSlug,
    menuSlug: asset.menuSlug,
    dishSlug: asset.dishSlug,
    version: asset.version
  }));
}

function accessDenied(): JobStoreFailure {
  return {
    ok: false,
    code: "restaurant_access_denied",
    message: owner3dAccessDeniedMessage(),
    status: 403
  };
}

function accessibleRestaurantSlugs(owner: OwnerIdentity): string[] | null {
  const access = getOwner3dRestaurantAccess(owner);
  if (access.mode === "all") return null;
  if (access.mode === "none") return [];
  return Array.from(access.slugs);
}

function filterFallbackIdentities(owner: OwnerIdentity): PipelineJobIdentity[] {
  const slugs = accessibleRestaurantSlugs(owner);
  if (slugs === null) return fallbackIdentities();
  if (slugs.length === 0) return [];

  const allowed = new Set(slugs);
  return fallbackIdentities().filter((identity) => allowed.has(identity.restaurantSlug));
}

export async function listOwner3dPipelineJobs(owner: OwnerIdentity): Promise<
  JobStoreSuccess<PipelineJobQueue> | JobStoreFailure
> {
  const slugs = accessibleRestaurantSlugs(owner);
  if (slugs?.length === 0) return accessDenied();

  const admin = getAdminClient();
  if (!admin.ok) {
    if (!canUseDevFallback()) return admin;

    return {
      ok: true,
      configured: false,
      value: buildFallbackPipelineJobs(filterFallbackIdentities(owner), "dev-owner")
    };
  }

  let query = admin.client
    .from(JOBS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (slugs) query = query.in("restaurant_slug", slugs);
  const { data, error } = await query;

  if (error) {
    if (!canUseDevFallback()) {
      return {
        ok: false,
        code: "job_store_unavailable",
        message: "Pipeline job store unavailable.",
        status: 503
      };
    }

    return {
      ok: true,
      configured: false,
      value: buildFallbackPipelineJobs(filterFallbackIdentities(owner), "dev-owner")
    };
  }

  return {
    ok: true,
    configured: true,
    value: {
      mode: "supabase",
      persisted: true,
      note: "Jobs persistants Supabase. Les commandes longues restent executees par un runner externe.",
      jobs: ((data ?? []) as PipelineJobRow[]).map(rowToJob)
    }
  };
}

export async function getOwner3dPipelineJob(
  jobId: string,
  owner: OwnerIdentity
): Promise<JobStoreSuccess<PipelineJob | null> | JobStoreFailure> {
  const listed = await listOwner3dPipelineJobs(owner);
  if (!listed.ok) return listed;
  if (!listed.configured) {
    return {
      ok: true,
      configured: false,
      value: listed.value.jobs.find((job) => job.id === jobId) ?? null
    };
  }

  const admin = getAdminClient();
  if (!admin.ok) return admin;
  const slugs = accessibleRestaurantSlugs(owner);
  if (slugs?.length === 0) return accessDenied();

  let query = admin.client
    .from(JOBS_TABLE)
    .select("*")
    .eq("id", jobId);
  if (slugs) query = query.in("restaurant_slug", slugs);
  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      ok: false,
      code: "job_store_unavailable",
      message: "Pipeline job store unavailable.",
      status: 503
    };
  }

  return {
    ok: true,
    configured: true,
    value: data ? rowToJob(data as PipelineJobRow) : null
  };
}

export async function enqueueOwner3dPipelineJob(args: {
  identity: PipelineJobIdentity;
  step: PipelineJobStep;
  owner: OwnerIdentity;
}): Promise<JobStoreSuccess<PipelineJob> | JobStoreFailure> {
  const admin = getAdminClient();
  if (!admin.ok) return admin;

  const job = createPipelineJobDraft({
    identity: args.identity,
    step: args.step,
    initiatedBy: args.owner.emailAddresses[0] ?? args.owner.userId
  });
  const insert = jobToInsert(job, args.owner);
  const latestSourceUploadId = await findLatestRunnableSourceUploadId(admin.client, args.identity);

  const existing = await admin.client
    .from(JOBS_TABLE)
    .select("*")
    .eq("dedupe_key", insert.dedupe_key)
    .in("status", ACTIVE_DEDUPE_STATUSES)
    .maybeSingle();

  if (existing.error) {
    return {
      ok: false,
      code: "job_store_unavailable",
      message: "Pipeline job store unavailable.",
      status: 503
    };
  }
  if (existing.data) {
    return {
      ok: true,
      configured: true,
      value: rowToJob(existing.data as PipelineJobRow)
    };
  }

  const { data, error } = await admin.client
    .from(JOBS_TABLE)
    .insert({
      ...insert,
      source_upload_id: latestSourceUploadId
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      code: "job_store_unavailable",
      message: "Pipeline job could not be queued.",
      status: 503
    };
  }

  return { ok: true, configured: true, value: rowToJob(data as PipelineJobRow) };
}

export async function updateOwner3dPipelineJobStatus(args: {
  jobId: string;
  nextStatus: PipelineJobStatus;
  owner: OwnerIdentity;
}): Promise<JobStoreSuccess<PipelineJob> | JobStoreFailure> {
  const current = await getOwner3dPipelineJob(args.jobId, args.owner);
  if (!current.ok) return current;
  if (!current.value) {
    return {
      ok: false,
      code: "job_not_found",
      message: "Pipeline job not found.",
      status: 404
    };
  }

  const transition = transitionJobStatus(current.value.status, args.nextStatus);
  if (!transition.ok) {
    return {
      ok: false,
      code: "invalid_transition",
      message: transition.error,
      status: 409
    };
  }

  const admin = getAdminClient();
  if (!admin.ok) return admin;

  const now = new Date().toISOString();
  const startedAt =
    args.nextStatus === "running" && !current.value.startedAt ? now : current.value.startedAt;
  const finishedAt = ["failed", "published", "rejected", "rolled_back", "cancelled"].includes(args.nextStatus)
    ? now
    : current.value.finishedAt;
  const durationMs =
    startedAt && finishedAt
      ? Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
      : current.value.observability.metrics.durationMs;
  const { data, error } = await admin.client
    .from(JOBS_TABLE)
    .update({
      status: args.nextStatus,
      updated_at: now,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: Number.isFinite(durationMs) ? durationMs : null,
      quality_status: args.nextStatus,
      logs: [
        ...current.value.logs,
        `Status transition recorded: ${current.value.status} -> ${args.nextStatus}`
      ].map(sanitizePipelineLogLine).slice(-300)
    })
    .eq("id", args.jobId)
    .eq("restaurant_slug", current.value.restaurantSlug)
    .eq("status", current.value.status)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      code: error ? "job_store_unavailable" : "invalid_transition",
      message: error
        ? "Pipeline job could not be updated."
        : "Pipeline job status changed before this transition.",
      status: error ? 503 : 409
    };
  }

  return { ok: true, configured: true, value: rowToJob(data as PipelineJobRow) };
}
