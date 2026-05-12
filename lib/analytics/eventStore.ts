import "server-only";

import type { AnalyticsEventPayload } from "@/lib/analytics/types";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { getSupabaseTableColumns, pickColumn } from "@/lib/analytics/serverRows";

type InsertEventResult =
  | { ok: true; persisted: true }
  | { ok: false; error: string };

function assignMappedValue(
  row: Record<string, unknown>,
  columns: Set<string>,
  candidates: string[],
  value: unknown
) {
  if (value === undefined || value === null || value === "") return;
  const column = columns.size > 0 ? pickColumn(columns, candidates) : candidates[0];
  if (column) row[column] = value;
}

export async function insertAnalyticsEvent(
  payload: AnalyticsEventPayload,
  userAgent: string
): Promise<InsertEventResult> {
  const admin = getSupabaseAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.reason };
  }

  const columns = await getSupabaseTableColumns("analytics_events");
  const row: Record<string, unknown> = {};

  assignMappedValue(row, columns, ["event_name", "eventName", "event_type"], payload.eventName);
  assignMappedValue(
    row,
    columns,
    ["restaurant_id", "restaurantId", "restaurant_uuid"],
    payload.restaurantId
  );
  assignMappedValue(row, columns, ["menu_id", "menuId"], payload.menuId);
  assignMappedValue(row, columns, ["session_id", "sessionId"], payload.sessionId);
  assignMappedValue(row, columns, ["source"], payload.source);
  assignMappedValue(row, columns, ["dish_slug", "dishSlug"], payload.dishSlug);
  assignMappedValue(row, columns, ["category_slug", "categorySlug"], payload.categorySlug);
  assignMappedValue(
    row,
    columns,
    ["search_query", "searchQuery", "search_term"],
    payload.searchQuery
  );
  assignMappedValue(row, columns, ["filter_name", "filterName"], payload.filterName);
  assignMappedValue(row, columns, ["cta_name", "ctaName"], payload.ctaName);
  assignMappedValue(row, columns, ["viewport"], payload.viewport);
  assignMappedValue(row, columns, ["metadata"], payload.metadata ?? {});
  assignMappedValue(row, columns, ["user_agent", "userAgent"], userAgent.slice(0, 500));

  const { error } = await admin.client.from("analytics_events").insert(row);

  if (error) {
    console.error("[Vistaire analytics] insert failed", error.message);
    return { ok: false, error: "Analytics event could not be persisted." };
  }

  return { ok: true, persisted: true };
}
