import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import {
  buildCdnWorkflowFromFiles,
  cdnStorageConfigured
} from "@/lib/owner/threeDCdnWorkflow";
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

export async function GET(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const identity = identityFromSearch(request);
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  return NextResponse.json({
    ok: true,
    message: "CDN workflow status loaded.",
    state: buildCdnWorkflowFromFiles(identity.identity)
  });
}

export async function POST(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  const body = await readSmallJson(request);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid CDN request." }, { status: 400 });
  }

  const identity = identityFromBody(body);
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  const state = buildCdnWorkflowFromFiles(identity.identity);
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "refresh") {
    return NextResponse.json({
      ok: true,
      message: "CDN workflow status refreshed.",
      state
    });
  }

  if (action === "validate_network") {
    return NextResponse.json(
      {
        ok: false,
        code: "manual_runner_required",
        message: "Run the manual network validation command, then refresh this panel.",
        manualCommand: state.validateNetworkCommand,
        state
      },
      { status: 409 }
    );
  }

  if (action === "upload_runtime") {
    if (!cdnStorageConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          code: "storage_not_configured",
          message: "storage not configured",
          manualCommand: state.manualUploadCommand,
          state
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "worker_required",
        message: "Runtime CDN upload must be performed by the configured worker/runner, not this request.",
        manualCommand: state.manualUploadCommand,
        state
      },
      { status: 501 }
    );
  }

  return NextResponse.json({ ok: false, error: "Unsupported CDN action.", state }, { status: 400 });
}
