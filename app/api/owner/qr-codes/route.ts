import { NextResponse, type NextRequest } from "next/server";
import {
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import { createOwnerQrCode } from "@/lib/owner/qrStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const originError = requireSameOriginOwnerMutation(request);
  if (originError) return originError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Formulaire invalide." },
      { status: 400 }
    );
  }

  const candidate = body as Record<string, unknown>;
  const restaurantId =
    typeof candidate.restaurantId === "string" ? candidate.restaurantId.slice(0, 80) : "";
  const label = typeof candidate.label === "string" ? candidate.label : "QR menu";
  const targetPath =
    typeof candidate.targetPath === "string" ? candidate.targetPath : "";

  if (!targetPath.startsWith("/")) {
    return NextResponse.json(
      { ok: false, error: "Chemin de destination invalide." },
      { status: 400 }
    );
  }

  const created = await createOwnerQrCode({
    restaurantId,
    label,
    targetPath,
    style: candidate.style
  });

  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.error }, { status: 503 });
  }

  // The raw token is returned ONCE so the client can render/encode the QR.
  return NextResponse.json(
    {
      ok: true,
      token: created.token,
      redirectUrl: created.record.redirectUrl,
      persisted: created.persisted,
      record: created.record
    },
    { status: 201 }
  );
}
