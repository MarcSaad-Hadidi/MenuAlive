import { NextResponse } from "next/server";
import { getOwnerDashboardData } from "@/lib/owner/data";
import { requireVistaireOwnerApi } from "@/lib/auth/ownerApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await requireVistaireOwnerApi();
  if (!owner.ok) return owner.response;

  const data = await getOwnerDashboardData();

  return NextResponse.json({
    ok: true,
    source: data.source,
    recommendationSource: data.recommendationSource,
    stats: data.stats,
    restaurants: data.restaurants,
    recommendations: data.recommendations
  });
}
