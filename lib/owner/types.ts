export type OwnerRestaurantStatus =
  | "demo"
  | "active"
  | "setup_needed"
  | "paused"
  | "archived";

export type OwnerReadinessStatus =
  | "ready"
  | "needs_setup"
  | "missing"
  | "demo";

export type OwnerQrStatus = "ready" | "generable" | "missing";

export type OwnerReadinessItem = {
  id: "profile" | "menu" | "photos" | "immersive" | "qr";
  label: string;
  detail: string;
  status: OwnerReadinessStatus;
};

export type OwnerRestaurant = {
  id: string;
  name: string;
  slug: string;
  isDemo: boolean;
  location: string;
  cuisineType: string;
  status: OwnerRestaurantStatus;
  statusLabel: string;
  dishCount: number;
  photoDishCount: number;
  immersiveDishCount: number;
  incompleteDishCount: number;
  openingsToday: number;
  interactionsToday: number;
  lastActivity: string;
  clientMenuHref: string;
  menuUrl: string;
  menuUrlSource: "column" | "derived_preview" | "demo";
  dashboardHref: string;
  qrTargetUrl: string;
  qrCodeUrl: string | null;
  qrStatus: OwnerQrStatus;
  qrStatusLabel: string;
  readinessScore: number;
  readinessItems: OwnerReadinessItem[];
  nextAction: string;
};

export type OwnerStats = {
  totalRestaurants: number;
  activeRestaurants: number;
  demoRestaurants: number;
  setupNeededRestaurants: number;
  menuReadyRestaurants: number;
  qrReadyRestaurants: number;
  totalDishes: number;
  dishesWithPhotos: number;
  dishesWithImmersive: number;
  actionsToTreat: number;
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

export type OwnerAction = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  title: string;
  body: string;
  href: string;
  priority: "high" | "medium" | "low";
};

export type OwnerDashboardData = {
  stats: OwnerStats;
  restaurants: OwnerRestaurant[];
  actions: OwnerAction[];
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
