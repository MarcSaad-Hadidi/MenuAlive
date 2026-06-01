import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import {
  PIPELINE_JOB_STEPS,
  queuePolicyForStep,
  type PipelineJobStep
} from "@/lib/owner/threeDJobsModel";
import {
  enqueueOwner3dPipelineJob,
  listOwner3dPipelineJobs
} from "@/lib/owner/threeDJobsStore";
import { validateSourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_JOB_POSTS_PER_MINUTE = 20;
const JOB_POST_WINDOW_MS = 60_000;

type JobRateLimitBucket = {
  count: number;
  resetAt: number;
};

type JobRateLimitGlobal = typeof globalThis & {
  __vistaireOwner3dJobRateLimit?: Map<string, JobRateLimitBucket>;
};

function isPipelineStep(value: unknown): value is PipelineJobStep {
  return typeof value === "string" && PIPELINE_JOB_STEPS.includes(value as PipelineJobStep);
}

function jobPostsPerMinute(): number {
  const parsed = Number(process.env.VISTAIRE_OWNER_3D_JOB_POSTS_PER_MINUTE);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100) {
    return DEFAULT_JOB_POSTS_PER_MINUTE;
  }
  return parsed;
}

function consumeJobMutationBudget(ownerId: string): boolean {
  const storeGlobal = globalThis as JobRateLimitGlobal;
  const store =
    storeGlobal.__vistaireOwner3dJobRateLimit ??
    new Map<string, JobRateLimitBucket>();
  storeGlobal.__vistaireOwner3dJobRateLimit = store;

  const now = Date.now();
  const limit = jobPostsPerMinute();
  const bucket = store.get(ownerId);
  if (!bucket || bucket.resetAt <= now) {
    store.set(ownerId, { count: 1, resetAt: now + JOB_POST_WINDOW_MS });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function GET() {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const result = await listOwner3dPipelineJobs(owner);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: result.configured,
    persisted: result.value.persisted,
    mode: result.value.mode,
    note: result.value.note,
    jobs: result.value.jobs
  });
}

export async function POST(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  if (!consumeJobMutationBudget(owner.userId)) {
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        error: "Trop de jobs 3D/AR demandes en une minute."
      },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide." }, { status: 400 });
  }

  const candidate = (body ?? {}) as Record<string, unknown>;
  if (!isPipelineStep(candidate.step)) {
    return NextResponse.json({ ok: false, error: "Pipeline step invalide." }, { status: 400 });
  }

  const queuePolicy = queuePolicyForStep(candidate.step);
  if (!queuePolicy.ok) {
    return NextResponse.json(
      { ok: false, error: queuePolicy.error },
      { status: queuePolicy.status }
    );
  }

  const identity = validateSourceUploadIdentity(candidate.identity);
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  const created = await enqueueOwner3dPipelineJob({
    identity: identity.identity,
    step: candidate.step,
    owner
  });

  if (!created.ok) {
    return NextResponse.json(
      { ok: false, code: created.code, error: created.message },
      { status: created.status }
    );
  }

  return NextResponse.json({ ok: true, job: created.value }, { status: 202 });
}
