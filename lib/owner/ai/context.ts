import type { OwnerDashboardData, OwnerRestaurant } from "@/lib/owner/types";

/**
 * Minimal, PII-free signal for a restaurant. Deliberately excludes contact
 * name/email/phone and internal notes — the AI never receives private data.
 */
export type OwnerAiRestaurantSignal = {
  name: string;
  slug: string;
  status: OwnerRestaurant["status"];
  dishCount: number;
  photoDishCount: number;
  immersiveDishCount: number;
  incompleteDishCount: number;
  qrStatus: OwnerRestaurant["qrStatus"];
  readinessScore: number;
  openingsToday: number;
  interactionsToday: number;
};

export type OwnerAiContext = {
  stats: {
    totalRestaurants: number;
    activeRestaurants: number;
    setupNeededRestaurants: number;
    menuReadyRestaurants: number;
    qrReadyRestaurants: number;
    dishesWithPhotos: number;
    totalDishes: number;
    dishesWithImmersive: number;
    menuOpensToday: number;
    dishViewsToday: number;
  };
  restaurants: OwnerAiRestaurantSignal[];
};

export function buildOwnerAiContext(data: OwnerDashboardData): OwnerAiContext {
  return {
    stats: {
      totalRestaurants: data.stats.totalRestaurants,
      activeRestaurants: data.stats.activeRestaurants,
      setupNeededRestaurants: data.stats.setupNeededRestaurants,
      menuReadyRestaurants: data.stats.menuReadyRestaurants,
      qrReadyRestaurants: data.stats.qrReadyRestaurants,
      dishesWithPhotos: data.stats.dishesWithPhotos,
      totalDishes: data.stats.totalDishes,
      dishesWithImmersive: data.stats.dishesWithImmersive,
      menuOpensToday: data.stats.menuOpensToday,
      dishViewsToday: data.stats.dishViewsToday
    },
    restaurants: data.restaurants
      .filter((restaurant) => !restaurant.isDemo)
      .map((restaurant) => ({
        name: restaurant.name,
        slug: restaurant.slug,
        status: restaurant.status,
        dishCount: restaurant.dishCount,
        photoDishCount: restaurant.photoDishCount,
        immersiveDishCount: restaurant.immersiveDishCount,
        incompleteDishCount: restaurant.incompleteDishCount,
        qrStatus: restaurant.qrStatus,
        readinessScore: restaurant.readinessScore,
        openingsToday: restaurant.openingsToday,
        interactionsToday: restaurant.interactionsToday
      }))
  };
}
