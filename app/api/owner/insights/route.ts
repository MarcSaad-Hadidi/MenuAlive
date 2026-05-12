import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOwnerDashboardData } from "@/lib/owner/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await auth.protect();

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
