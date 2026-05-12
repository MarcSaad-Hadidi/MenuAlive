import "server-only";

import { getAllDishes, getRestaurant } from "@/lib/demoMenuData";
import {
  filterRowsByRestaurantId,
  getDateLabel,
  getNumber,
  getString,
  getSupabaseTableColumns,
  pickColumn,
  readSupabaseRows,
  type AnyRow
} from "@/lib/analytics/serverRows";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { getDemoRestaurantId } from "@/lib/analytics/insights";
import { getAutomaticOwnerRecommendations } from "@/lib/owner/recommendations";
import type {
  CreateRestaurantInput,
  OwnerDashboardData,
  OwnerRecommendation,
  OwnerRestaurant,
  OwnerRestaurantStatus,
  OwnerStats
} from "@/lib/owner/types";

const STATUS_LABELS: Record<OwnerRestaurantStatus, string> = {
  demo: "Présentation",
  active: "Actif",
  setup_needed: "À configurer",
  paused: "Pausé",
  archived: "Archivé"
};

const STATUS_VALUES = new Set<OwnerRestaurantStatus>([
  "demo",
  "active",
  "setup_needed",
  "paused",
  "archived"
]);

type CreateRestaurantResult =
  | { ok: true; restaurant: OwnerRestaurant }
  | { ok: false; error: string };

function normalizeStatus(value: string): OwnerRestaurantStatus {
  if (STATUS_VALUES.has(value as OwnerRestaurantStatus)) {
    return value as OwnerRestaurantStatus;
  }
  if (value === "setup") return "setup_needed";
  return "demo";
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function todayEventCount(rows: AnyRow[], restaurantId: string, eventNames: string[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return filterRowsByRestaurantId(rows, restaurantId).filter((row) => {
    const eventName = getString(row, ["event_name", "eventName", "event_type"], "");
    const rawDate = getString(row, ["created_at", "timestamp", "occurred_at"], "");
    return eventNames.includes(eventName) && rawDate.slice(0, 10) === today;
  }).length;
}

function mapRestaurantRow(args: {
  row: AnyRow;
  dishCount: number;
  openingsToday: number;
  interactionsToday: number;
}): OwnerRestaurant {
  const id = getString(args.row, ["id", "restaurant_id"], "");
  const slug = getString(args.row, ["slug", "restaurant_slug"], slugify(getString(args.row, ["name"], "restaurant")));
  const name = getString(args.row, ["name", "restaurant_name"], "Restaurant");
  const status = normalizeStatus(getString(args.row, ["status"], "demo"));
  const isDemo = id === getDemoRestaurantId() || slug === "maison-elyse";

  return {
    id: id || slug,
    name,
    slug,
    location: getString(args.row, ["location", "city", "address"], "Emplacement à préciser"),
    cuisineType: getString(args.row, ["cuisine_type", "cuisineType"], "Cuisine à préciser"),
    status: isDemo ? "demo" : status,
    statusLabel: STATUS_LABELS[isDemo ? "demo" : status],
    dishCount: args.dishCount,
    openingsToday: args.openingsToday,
    interactionsToday: args.interactionsToday,
    lastActivity: getDateLabel(args.row, ["last_activity_at", "updated_at", "created_at"]),
    clientMenuHref: isDemo ? "/demo" : `/demo?restaurant=${encodeURIComponent(slug)}`,
    dashboardHref: isDemo ? "/admin" : `/admin?restaurantId=${encodeURIComponent(id || slug)}`
  };
}

function fallbackOwnerRestaurant(): OwnerRestaurant {
  const restaurant = getRestaurant();
  return {
    id: getDemoRestaurantId(),
    name: restaurant.name,
    slug: restaurant.slug,
    location: restaurant.location,
    cuisineType: restaurant.cuisineType,
    status: "demo",
    statusLabel: STATUS_LABELS.demo,
    dishCount: getAllDishes().length,
    openingsToday: 248,
    interactionsToday: 118,
    lastActivity: "Aujourd'hui",
    clientMenuHref: "/demo",
    dashboardHref: "/admin"
  };
}

function buildStats(restaurants: OwnerRestaurant[], dailyRows: AnyRow[]): OwnerStats {
  const menuOpensToday =
    dailyRows.reduce(
      (sum, row) =>
        sum +
        getNumber(row, [
          "menu_opens",
          "menu_opened",
          "open_count",
          "sessions",
          "session_count"
        ]),
      0
    ) || restaurants.reduce((sum, restaurant) => sum + restaurant.openingsToday, 0);
  const dishViewsToday = dailyRows.reduce(
    (sum, row) =>
      sum +
      getNumber(row, [
        "dish_views",
        "dish_view_count",
        "views",
        "view_count",
        "total_views"
      ]),
    0
  );
  const immersiveInteractionsToday =
    dailyRows.reduce(
      (sum, row) =>
        sum +
        getNumber(row, [
          "immersive_interactions",
          "immersive_count",
          "dish_3d_clicked",
          "three_d_clicks",
          "ar_clicks"
        ]),
      0
    ) || restaurants.reduce((sum, restaurant) => sum + restaurant.interactionsToday, 0);
  const mostActive = [...restaurants].sort(
    (a, b) => b.openingsToday + b.interactionsToday - (a.openingsToday + a.interactionsToday)
  )[0];

  return {
    totalRestaurants: restaurants.length,
    activeRestaurants: restaurants.filter((restaurant) => restaurant.status === "active").length,
    demoRestaurants: restaurants.filter((restaurant) => restaurant.status === "demo").length,
    setupNeededRestaurants: restaurants.filter(
      (restaurant) => restaurant.status === "setup_needed"
    ).length,
    menuOpensToday,
    dishViewsToday,
    immersiveInteractionsToday,
    mostActiveRestaurant: mostActive?.name ?? "Aucun signal"
  };
}

function mapStoredRecommendations(rows: AnyRow[]): OwnerRecommendation[] {
  return rows.slice(0, 6).map((row, index) => {
    const type = getString(row, ["type", "recommendation_type"], "opportunity");
    const normalizedType: OwnerRecommendation["type"] =
      type === "watch" || type === "setup" || type === "upsell"
        ? type
        : "opportunity";

    return {
      id: getString(row, ["id"], `stored-${index}`),
      title: getString(row, ["title"], "Recommandation à traiter"),
      body: getString(row, ["body", "description", "recommendation"], ""),
      restaurantName: getString(row, ["restaurant_name", "restaurantName"], ""),
      type: normalizedType,
      source: "stored"
    };
  });
}

export async function getOwnerDashboardData(): Promise<OwnerDashboardData> {
  const [restaurantsResult, dishesResult, dailyResult, eventsResult, storedResult] =
    await Promise.all([
      readSupabaseRows("restaurants", 200),
      readSupabaseRows("menu_dishes", 1_000),
      readSupabaseRows("restaurant_daily_analytics", 300),
      readSupabaseRows("analytics_events", 1_000),
      readSupabaseRows("owner_ai_recommendations", 100)
    ]);

  const restaurants =
    restaurantsResult.ok && restaurantsResult.rows.length
      ? restaurantsResult.rows.map((row) => {
          const restaurantId = getString(row, ["id", "restaurant_id"], "");
          const dishCount = dishesResult.ok
            ? filterRowsByRestaurantId(dishesResult.rows, restaurantId).length ||
              (restaurantId === getDemoRestaurantId() ? getAllDishes().length : 0)
            : restaurantId === getDemoRestaurantId()
              ? getAllDishes().length
              : 0;
          const openingsToday = eventsResult.ok
            ? todayEventCount(eventsResult.rows, restaurantId, [
                "menu_opened",
                "session_started"
              ])
            : 0;
          const interactionsToday = eventsResult.ok
            ? todayEventCount(eventsResult.rows, restaurantId, [
                "dish_opened",
                "dish_3d_clicked",
                "dish_ar_clicked",
                "cta_clicked"
              ])
            : 0;

          return mapRestaurantRow({
            row,
            dishCount,
            openingsToday,
            interactionsToday
          });
        })
      : [fallbackOwnerRestaurant()];

  const stats = buildStats(
    restaurants,
    dailyResult.ok ? dailyResult.rows : []
  );
  const storedRecommendations = storedResult.ok
    ? mapStoredRecommendations(storedResult.rows)
    : [];
  const automatic = await getAutomaticOwnerRecommendations({
    stats,
    restaurants,
    storedRecommendations
  });

  return {
    stats,
    restaurants,
    recommendations: automatic.recommendations,
    recommendationSource: automatic.source,
    source:
      restaurantsResult.ok && restaurantsResult.rows.length ? "supabase" : "fallback",
    note:
      restaurantsResult.ok && restaurantsResult.rows.length
        ? "Données restaurants connectées à Supabase."
        : "Données de présentation affichées tant que Supabase ne répond pas."
  };
}

export function validateCreateRestaurantInput(
  input: unknown
): { ok: true; value: CreateRestaurantInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Formulaire invalide." };
  }

  const candidate = input as Record<string, unknown>;
  const name = getString(candidate, ["name"], "").slice(0, 120);
  const slug = slugify(getString(candidate, ["slug"], name)).slice(0, 80);
  const location = getString(candidate, ["location"], "").slice(0, 160);
  const cuisineType = getString(candidate, ["cuisineType", "cuisine_type"], "").slice(0, 120);
  const status = normalizeStatus(getString(candidate, ["status"], "setup_needed"));
  const contactName = getString(candidate, ["contactName", "contact_name"], "").slice(0, 120);
  const contactEmail = getString(candidate, ["contactEmail", "contact_email"], "").slice(0, 160);
  const contactPhone = getString(candidate, ["contactPhone", "contact_phone"], "").slice(0, 60);
  const notes = getString(candidate, ["notes"], "").slice(0, 800);

  if (!name || name.length < 2) return { ok: false, error: "Nom du restaurant requis." };
  if (!slug || slug.length < 2) return { ok: false, error: "Slug invalide." };
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "Email contact invalide." };
  }

  return {
    ok: true,
    value: {
      name,
      slug,
      location,
      cuisineType,
      status,
      contactName,
      contactEmail,
      ...(contactPhone ? { contactPhone } : {}),
      ...(notes ? { notes } : {})
    }
  };
}

function assignInsertValue(
  row: Record<string, unknown>,
  columns: Set<string>,
  candidates: string[],
  value: unknown
) {
  if (value === undefined || value === "") return;
  const column = columns.size > 0 ? pickColumn(columns, candidates) : candidates[0];
  if (column) row[column] = value;
}

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<CreateRestaurantResult> {
  const admin = getSupabaseAdminClient();
  if (!admin.ok) {
    return { ok: false, error: "Configuration serveur Supabase manquante." };
  }

  const columns = await getSupabaseTableColumns("restaurants");
  const row: Record<string, unknown> = {};

  assignInsertValue(row, columns, ["name", "restaurant_name"], input.name);
  assignInsertValue(row, columns, ["slug", "restaurant_slug"], input.slug);
  assignInsertValue(row, columns, ["location", "city"], input.location);
  assignInsertValue(row, columns, ["cuisine_type", "cuisineType"], input.cuisineType);
  assignInsertValue(row, columns, ["status"], input.status);
  assignInsertValue(row, columns, ["contact_name", "contactName"], input.contactName);
  assignInsertValue(row, columns, ["contact_email", "contactEmail"], input.contactEmail);
  assignInsertValue(row, columns, ["contact_phone", "contactPhone", "phone"], input.contactPhone);
  assignInsertValue(row, columns, ["notes", "internal_notes"], input.notes);

  const { data, error } = await admin.client
    .from("restaurants")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error("[Vistaire owner] create restaurant failed", error.message);
    return {
      ok: false,
      error: "Le restaurant n'a pas pu être créé. Vérifiez les champs et la configuration Supabase."
    };
  }

  const mapped = mapRestaurantRow({
    row: (data ?? row) as AnyRow,
    dishCount: 0,
    openingsToday: 0,
    interactionsToday: 0
  });

  return { ok: true, restaurant: mapped };
}
