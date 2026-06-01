import { NextResponse, type NextRequest } from "next/server";
import {
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import {
  getOwner3dPipelineJob,
  updateOwner3dPipelineJobStatus
} from "@/lib/owner/threeDJobsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  jobId: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const { jobId } = await params;
  const result = await getOwner3dPipelineJob(jobId, owner);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.message },
      { status: result.status }
    );
  }
  if (!result.value) {
    return NextResponse.json({ ok: false, error: "Pipeline job introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    configured: result.configured,
    job: result.value
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  const { jobId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide." }, { status: 400 });
  }

  const action = (body as Record<string, unknown> | null)?.action;
  const nextStatus =
    action === "cancel" ? "cancelled" : action === "retry" ? "queued" : null;
  if (!nextStatus) {
    return NextResponse.json({ ok: false, error: "Action job invalide." }, { status: 400 });
  }

  const updated = await updateOwner3dPipelineJobStatus({ jobId, nextStatus, owner });
  if (!updated.ok) {
    return NextResponse.json(
      { ok: false, code: updated.code, error: updated.message },
      { status: updated.status }
    );
  }

  return NextResponse.json({ ok: true, job: updated.value });
}
