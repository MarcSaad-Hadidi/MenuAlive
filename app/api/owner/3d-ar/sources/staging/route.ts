import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import { validateSourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";
import { deleteOwner3dStagingSource } from "@/lib/owner/threeDSourceUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DELETE_CONFIRMATION_TEXT = "DELETE STAGING SOURCE";

type DeleteRequest = {
  sourceId?: unknown;
  restaurantSlug?: unknown;
  menuSlug?: unknown;
  dishSlug?: unknown;
  version?: unknown;
  confirmed?: unknown;
  confirmationText?: unknown;
};

export async function DELETE(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  let body: DeleteRequest;
  try {
    body = (await request.json()) as DeleteRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide." }, { status: 400 });
  }

  const confirmationText =
    typeof body.confirmationText === "string" ? body.confirmationText : "";
  const identity = validateSourceUploadIdentity({
    restaurantSlug: body.restaurantSlug,
    menuSlug: body.menuSlug,
    dishSlug: body.dishSlug,
    version: body.version
  });
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  const result = await deleteOwner3dStagingSource({
    sourceId: typeof body.sourceId === "string" ? body.sourceId : "",
    identity: identity.identity,
    confirmed: body.confirmed === true && confirmationText === DELETE_CONFIRMATION_TEXT,
    confirmationText,
    owner
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, deleted: true });
}
