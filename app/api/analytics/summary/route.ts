import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getDemoRestaurantId,
  getRestaurantInsights
} from "@/lib/analytics/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await auth.protect();

  const restaurantId =
    request.nextUrl.searchParams.get("restaurantId") ?? getDemoRestaurantId();
  const result = await getRestaurantInsights(restaurantId);

  return NextResponse.json({
    ok: true,
    source: result.source,
    note: result.note,
    insights: result.insights
  });
}
