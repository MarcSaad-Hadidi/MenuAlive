import { createReadStream } from "node:fs";
import { lstat, realpath, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import { validateSourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";
import { getOwner3dVisualReview } from "@/lib/owner/threeDVisualReviewServer";
import {
  allowedVisualReviewArtifactPaths,
  reviewArtifactPathMatchesIdentity,
  validateReviewArtifactPath
} from "@/lib/owner/threeDVisualReviewModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_ARTIFACT_BYTES = 100 * 1024 * 1024;
const HARD_MAX_ARTIFACT_BYTES = 250 * 1024 * 1024;

function isInsideRepo(path: string): boolean {
  const root = resolve(/* turbopackIgnore: true */ process.cwd());
  const target = resolve(path);
  return target === root || target.startsWith(`${root}\\`) || target.startsWith(`${root}/`);
}

function maxArtifactBytes(): number {
  const parsed = Number(process.env.VISTAIRE_OWNER_3D_REVIEW_ARTIFACT_MAX_BYTES);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_MAX_ARTIFACT_BYTES;
  return Math.min(parsed, HARD_MAX_ARTIFACT_BYTES);
}

function allowedRootForArtifact(relativePath: string): string | null {
  if (relativePath.startsWith("assets/3d/reports/")) return "assets/3d/reports";
  if (relativePath.startsWith("assets/3d/source/")) return "assets/3d/source";
  if (relativePath.startsWith("assets/3d/work/")) return "assets/3d/work";
  return null;
}

function realPathInside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}\\`) || target.startsWith(`${root}/`);
}

export async function GET(request: NextRequest) {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const params = request.nextUrl.searchParams;
  const identity = validateSourceUploadIdentity({
    restaurantSlug: params.get("restaurantSlug"),
    menuSlug: params.get("menuSlug"),
    dishSlug: params.get("dishSlug"),
    version: params.get("version")
  });
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  const requestedPath = params.get("path");
  const validation = validateReviewArtifactPath(requestedPath);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  if (!reviewArtifactPathMatchesIdentity(validation.relativePath, identity.identity)) {
    return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
  }

  const review = getOwner3dVisualReview(identity.identity);
  if (!review) {
    return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
  }
  if (!allowedVisualReviewArtifactPaths(review).has(validation.relativePath)) {
    return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
  }

  const absolutePath = join(/* turbopackIgnore: true */ process.cwd(), validation.relativePath);
  if (!isInsideRepo(absolutePath)) {
    return NextResponse.json({ ok: false, error: "Artifact path is invalid." }, { status: 400 });
  }

  try {
    const linkStat = await lstat(absolutePath);
    if (linkStat.isSymbolicLink()) {
      return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
    }

    const allowedRoot = allowedRootForArtifact(validation.relativePath);
    if (!allowedRoot) {
      return NextResponse.json({ ok: false, error: "Artifact path is invalid." }, { status: 400 });
    }
    const rootRealPath = await realpath(join(/* turbopackIgnore: true */ process.cwd(), allowedRoot));
    const targetRealPath = await realpath(absolutePath);
    if (!realPathInside(rootRealPath, targetRealPath)) {
      return NextResponse.json({ ok: false, error: "Artifact path is invalid." }, { status: 400 });
    }

    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
    }
    if (fileStat.size > maxArtifactBytes()) {
      return NextResponse.json({ ok: false, error: "Artifact exceeds owner review limit." }, { status: 413 });
    }

    const stream = Readable.toWeb(createReadStream(absolutePath)) as unknown as BodyInit;
    return new NextResponse(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Length": String(fileStat.size),
        "Content-Type": validation.contentType,
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
  }
}
