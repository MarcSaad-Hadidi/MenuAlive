import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import {
  parseSourceUploadLimit,
  validateSourceGlbFile,
  validateSourceUploadIdentity
} from "@/lib/owner/threeDSourceUploadModel";
import { createOwner3dSourceUpload } from "@/lib/owner/threeDSourceUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

export async function POST(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  const uploadLimit = parseSourceUploadLimit(process.env);
  if (!uploadLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Upload size cap is not configured correctly." },
      { status: 503 }
    );
  }

  const rawContentLength = request.headers.get("content-length");
  const contentLength = rawContentLength ? Number(rawContentLength) : 0;
  if (!rawContentLength || !Number.isFinite(contentLength) || contentLength <= 0) {
    return NextResponse.json(
      { ok: false, error: "Upload content length is required." },
      { status: 411 }
    );
  }
  if (contentLength > uploadLimit.maxBytes + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Source file is larger than the upload cap." },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Formulaire invalide." }, { status: 400 });
  }

  const identityResult = validateSourceUploadIdentity({
    restaurantSlug: formData.get("restaurantSlug"),
    menuSlug: formData.get("menuSlug"),
    dishSlug: formData.get("dishSlug"),
    version: formData.get("version")
  });

  if (!identityResult.ok) {
    return NextResponse.json({ ok: false, error: identityResult.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(
    owner,
    identityResult.identity.restaurantSlug
  );
  if (accessError) return accessError;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Source GLB requis." }, { status: 400 });
  }

  if (file.size > uploadLimit.maxBytes) {
    return NextResponse.json(
      { ok: false, error: "Source file is larger than the upload cap." },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileResult = validateSourceGlbFile(
    {
      name: file.name,
      type: file.type,
      size: file.size,
      bytes
    },
    uploadLimit.maxBytes
  );

  if (!fileResult.ok) {
    return NextResponse.json(
      { ok: false, error: fileResult.error },
      { status: fileResult.status }
    );
  }

  const created = await createOwner3dSourceUpload({
    identity: identityResult.identity,
    originalName: fileResult.originalName,
    mimeType: fileResult.mimeType,
    bytes: fileResult.bytes,
    owner
  });

  if (!created.ok) {
    return NextResponse.json(
      { ok: false, code: created.code, error: created.message },
      { status: created.status }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      persisted: created.persisted,
      status: created.record.status,
      record: created.record
    },
    { status: 201 }
  );
}
