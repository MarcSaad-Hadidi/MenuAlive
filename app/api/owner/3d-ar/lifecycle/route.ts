import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import {
  getOwner3dPipelineAsset,
  getOwner3dPipelineVersions
} from "@/lib/owner/threeDArPipeline";
import {
  rollbackCommandForTarget,
  validateLifecycleConfirmation,
  type Owner3dEvidenceLink
} from "@/lib/owner/threeDLifecycleModel";
import {
  listOwner3dLifecycleEvents,
  recordOwner3dLifecycleRequestEvent
} from "@/lib/owner/threeDLifecycleEventsStore";
import { validateSourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_JSON_BYTES = 16 * 1024;

function identityFromSearch(request: NextRequest) {
  return validateSourceUploadIdentity({
    restaurantSlug: request.nextUrl.searchParams.get("restaurantSlug"),
    menuSlug: request.nextUrl.searchParams.get("menuSlug"),
    dishSlug: request.nextUrl.searchParams.get("dishSlug"),
    version: request.nextUrl.searchParams.get("version")
  });
}

async function readSmallJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  const rawContentLength = request.headers.get("content-length");
  const contentLength = rawContentLength ? Number(rawContentLength) : 0;
  if (!rawContentLength || !Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_JSON_BYTES) {
    return null;
  }

  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function identityFromBody(body: Record<string, unknown>) {
  const identity = body.identity && typeof body.identity === "object" && !Array.isArray(body.identity)
    ? (body.identity as Record<string, unknown>)
    : body;

  return validateSourceUploadIdentity({
    restaurantSlug: identity.restaurantSlug,
    menuSlug: identity.menuSlug,
    dishSlug: identity.dishSlug,
    version: identity.version
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength)
    : "";
}

function lifecycleEvidence(asset: NonNullable<ReturnType<typeof getOwner3dPipelineAsset>>): Owner3dEvidenceLink[] {
  return [
    { label: "Version manifest", path: asset.manifestPath ?? "" },
    { label: "Network report", path: asset.cdn.networkReportPath },
    { label: "Upload plan", path: asset.cdn.uploadPlanPath }
  ];
}

export async function GET(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const identity = identityFromSearch(request);
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  const asset = getOwner3dPipelineAsset(identity.identity);
  if (!asset) {
    return NextResponse.json({ ok: false, error: "Lifecycle asset not found." }, { status: 404 });
  }

  const listed = await listOwner3dLifecycleEvents({
    identity: identity.identity,
    fallbackEvents: asset.lifecycle.auditEvents
  });

  if (!listed.ok) {
    return NextResponse.json(
      { ok: false, code: listed.code, error: listed.message },
      { status: listed.status }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: listed.configured,
    events: listed.value
  });
}

export async function POST(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  const body = await readSmallJson(request);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid lifecycle request." }, { status: 400 });
  }

  const identity = identityFromBody(body);
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  const asset = getOwner3dPipelineAsset(identity.identity);
  if (!asset) {
    return NextResponse.json({ ok: false, error: "Lifecycle asset not found." }, { status: 404 });
  }

  const action = cleanText(body.action, 80);
  const confirmation = cleanText(body.confirmation, 240);
  const targetVersion = cleanText(body.targetVersion, 80);

  if (action === "finalize") {
    const validation = validateLifecycleConfirmation({
      action: "finalize",
      state: asset.lifecycle,
      typed: confirmation
    });
    return NextResponse.json(
      {
        ok: false,
        code: "manual_runner_required",
        error: validation.ok
          ? "Finalize must be executed by the external runner, then refreshed from the manifest."
          : validation.error,
        manualCommand: asset.lifecycle.finalizationCommand
      },
      { status: validation.ok ? 409 : 400 }
    );
  }

  if (action === "publish") {
    const validation = validateLifecycleConfirmation({
      action: "publish",
      state: asset.lifecycle,
      typed: confirmation
    });
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 409 });
    }

    const recorded = await recordOwner3dLifecycleRequestEvent({
      identity: identity.identity,
      owner,
      action: "publish_requested",
      fromStatus: asset.lifecycle.currentState,
      toStatus: "publish_requested",
      command: asset.lifecycle.publishCommand,
      evidenceLinks: lifecycleEvidence(asset),
      reason: "Owner typed publish confirmation; external runner still required."
    });

    if (!recorded.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: recorded.code,
          error: recorded.message,
          manualCommand: asset.lifecycle.publishCommand
        },
        { status: recorded.status }
      );
    }

    return NextResponse.json({
      ok: true,
      event: recorded.value,
      manualCommand: asset.lifecycle.publishCommand,
      message: "Publish request audit event recorded. Run the external command to write active manifests."
    });
  }

  if (action === "rollback") {
    const versions = getOwner3dPipelineVersions(identity.identity);
    const target = versions.find(
      (version) =>
        version.version === targetVersion &&
        version.version !== asset.version &&
        (version.status === "published" || Boolean(version.lifecycle.publishedAt))
    );
    const validation = validateLifecycleConfirmation({
      action: "rollback",
      state: asset.lifecycle,
      typed: confirmation,
      targetVersion: target?.version ?? null
    });
    if (!target) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rollback target must be a previous published version."
        },
        { status: 409 }
      );
    }
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 409 });
    }

    const command = rollbackCommandForTarget(identity.identity, target.version);
    const recorded = await recordOwner3dLifecycleRequestEvent({
      identity: identity.identity,
      owner,
      action: "rollback_requested",
      fromStatus: asset.version,
      toStatus: target.version,
      targetVersion: target.version,
      command,
      evidenceLinks: lifecycleEvidence(asset),
      reason: "Owner typed rollback confirmation; external runner still required."
    });

    if (!recorded.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: recorded.code,
          error: recorded.message,
          manualCommand: command
        },
        { status: recorded.status }
      );
    }

    return NextResponse.json({
      ok: true,
      event: recorded.value,
      manualCommand: command,
      message: "Rollback request audit event recorded. Run the external command; no version is deleted."
    });
  }

  return NextResponse.json({ ok: false, error: "Unsupported lifecycle action." }, { status: 400 });
}
