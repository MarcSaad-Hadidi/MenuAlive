export type OwnerRestaurantStatus =
  | "demo"
  | "active"
  | "setup_needed"
  | "paused"
  | "archived";

export type OwnerRestaurant = {
  id: string;
  name: string;
  slug: string;
  location: string;
  cuisineType: string;
  status: OwnerRestaurantStatus;
  statusLabel: string;
  dishCount: number;
  openingsToday: number;
  interactionsToday: number;
  lastActivity: string;
  clientMenuHref: string;
  dashboardHref: string;
};

export type OwnerStats = {
  totalRestaurants: number;
  activeRestaurants: number;
  demoRestaurants: number;
  setupNeededRestaurants: number;
  menuOpensToday: number;
  dishViewsToday: number;
  immersiveInteractionsToday: number;
  mostActiveRestaurant: string;
};

export type OwnerRecommendation = {
  id: string;
  title: string;
  body: string;
  type: "opportunity" | "watch" | "setup" | "upsell";
  restaurantName?: string;
  source: "stored" | "mistral" | "rules";
};

export type OwnerDashboardData = {
  stats: OwnerStats;
  restaurants: OwnerRestaurant[];
  recommendations: OwnerRecommendation[];
  source: "supabase" | "fallback";
  recommendationSource: "stored" | "mistral" | "rules";
  note: string;
};

export type CreateRestaurantInput = {
  name: string;
  slug: string;
  location: string;
  cuisineType: string;
  status: OwnerRestaurantStatus;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
};
