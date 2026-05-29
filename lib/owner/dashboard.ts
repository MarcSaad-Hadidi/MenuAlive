import "server-only";

import { cache } from "react";
import { getOwnerDashboardData } from "@/lib/owner/data";

/**
 * Per-request memoized dashboard read so multiple owner route segments can
 * share a single Supabase round-trip without prop-drilling through the layout.
 */
export const getOwnerDashboard = cache(getOwnerDashboardData);
