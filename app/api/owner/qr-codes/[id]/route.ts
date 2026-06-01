import { NextResponse, type NextRequest } from "next/server";
import {
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import { updateOwnerQrCode } from "@/lib/owner/qrStore";
import type { OwnerQrCodeStatus } from "@/lib/owner/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_VALUES: OwnerQrCodeStatus[] = ["active", "paused", "archived"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "QR id requis." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide." }, { status: 400 });
  }

  const candidate = (body ?? {}) as Record<string, unknown>;
  const status =
    typeof candidate.status === "string" &&
    STATUS_VALUES.includes(candidate.status as OwnerQrCodeStatus)
      ? (candidate.status as OwnerQrCodeStatus)
      : undefined;

  const updated = await updateOwnerQrCode(id, {
    ...(status ? { status } : {}),
    ...(candidate.style !== undefined ? { style: candidate.style } : {}),
    ...(typeof candidate.label === "string" ? { label: candidate.label } : {})
  });

  if (!updated.ok) {
    return NextResponse.json({ ok: false, error: updated.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, record: updated.record });
}
