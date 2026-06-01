import { NextResponse, type NextRequest } from "next/server";
import {
  requireOwner3dRestaurantAccess,
  requireSameOriginOwnerMutation,
  requireVistaireOwnerApi
} from "@/lib/auth/ownerApi";
import { validateSourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";
import { getOwner3dVisualReview } from "@/lib/owner/threeDVisualReviewServer";
import { validateVisualReviewAction } from "@/lib/owner/threeDVisualReviewModel";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISUAL_REVIEWS_TABLE = "owner_3d_visual_reviews";

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

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

  const payload = (body ?? {}) as Record<string, unknown>;
  const identity = validateSourceUploadIdentity(payload.identity);
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.error }, { status: 400 });
  }
  const accessError = requireOwner3dRestaurantAccess(owner, identity.identity.restaurantSlug);
  if (accessError) return accessError;

  const review = getOwner3dVisualReview(identity.identity);
  if (!review) {
    return NextResponse.json({ ok: false, error: "Visual review asset not found." }, { status: 404 });
  }

  const expectedReport = cleanText(payload.expectedVisualReportSha256, 80);
  const actualReport = review.visualReportSha256 ?? "missing";
  if (expectedReport !== actualReport) {
    return NextResponse.json(
      { ok: false, error: "Visual report changed. Reload the review before recording a decision." },
      { status: 409 }
    );
  }

  const expectedCandidate = cleanText(payload.expectedSelectedCandidate, 240);
  if (expectedCandidate !== review.selectedCandidate) {
    return NextResponse.json(
      { ok: false, error: "Selected candidate changed. Reload the review before recording a decision." },
      { status: 409 }
    );
  }

  const action = payload.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ ok: false, error: "Visual review action is invalid." }, { status: 400 });
  }

  const reviewerName =
    cleanText(payload.reviewerName, 120) ||
    cleanText(owner.emailAddresses[0], 120) ||
    cleanText(owner.userId, 120);
  const note = cleanText(payload.note, 2000);
  const validation = validateVisualReviewAction(
    action === "approve" ? { action, reviewerName } : { action, note },
    review
  );

  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 409 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: "Visual review store is not configured." },
      { status: 503 }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await admin.client
    .from(VISUAL_REVIEWS_TABLE)
    .insert({
      restaurant_slug: identity.identity.restaurantSlug,
      menu_slug: identity.identity.menuSlug,
      dish_slug: identity.identity.dishSlug,
      asset_version: identity.identity.version,
      visual_report_sha256: review.visualReportSha256,
      selected_candidate: review.selectedCandidate,
      status: validation.reviewStatus,
      threshold: "strict",
      reviewed_by_clerk_user_id: owner.userId,
      reviewed_by_email: owner.emailAddresses[0] ?? null,
      reviewed_at: now,
      scores: Object.fromEntries(
        review.summaryMetrics.map((metric) => [
          metric.label,
          { value: metric.value, status: metric.status }
        ])
      ),
      findings:
        validation.reviewStatus === "rejected"
          ? [{ type: "owner_note", note: validation.note }]
          : [],
      notes: validation.reviewStatus === "rejected" ? validation.note : null,
      metadata: {
        reviewerName: validation.reviewerName ?? reviewerName,
        selectedCandidate: review.selectedCandidate,
        selectedCandidateReason: review.selectedCandidateReason,
        visualReportSha256: review.visualReportSha256,
        visualReportValid: review.visualReportValid,
        evidenceAngles: review.angles.length,
        sideEffect: "review_only"
      }
    })
    .select("id,status,reviewed_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Visual review could not be recorded." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    review: data,
    message:
      validation.reviewStatus === "approved"
        ? "Visual review approved."
        : "Visual review rejected with owner note."
  });
}
