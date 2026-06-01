import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import {
  validateSourceUploadIdentity,
  type SourceUploadIdentity
} from "@/lib/owner/threeDSourceUploadModel";
import {
  getOwner3dSourceUploadStatus,
  getOwner3dSourceUploadStorageStatus
} from "@/lib/owner/threeDSourceUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function identityFromRequest(request: NextRequest): SourceUploadIdentity | null {
  const params = request.nextUrl.searchParams;
  const candidate = {
    restaurantSlug: params.get("restaurantSlug") ?? "",
    menuSlug: params.get("menuSlug") ?? "",
    dishSlug: params.get("dishSlug") ?? "",
    version: params.get("version") ?? ""
  };

  if (!Object.values(candidate).some(Boolean)) return null;
  return candidate;
}

export async function GET(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const storage = getOwner3dSourceUploadStorageStatus();
  const candidate = identityFromRequest(request);

  if (candidate) {
    const validated = validateSourceUploadIdentity(candidate);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }
    const accessError = requireOwner3dRestaurantAccess(
      owner,
      validated.identity.restaurantSlug
    );
    if (accessError) return accessError;
  }

  const status = await getOwner3dSourceUploadStatus(candidate);

  if (!status.ok) {
    return NextResponse.json(
      { ok: false, code: status.code, error: status.message },
      { status: status.status }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: status.configured,
    code: storage.code,
    message: storage.message,
    provider: storage.provider,
    record: status.record
  });
}
