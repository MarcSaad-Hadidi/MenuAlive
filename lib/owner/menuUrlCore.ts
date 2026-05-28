export function slugifyRestaurantSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildRestaurantMenuPath(slugOrName: string): string {
  const slug = slugifyRestaurantSlug(slugOrName);
  if (!slug) return "/demo";

  return `/demo?restaurant=${encodeURIComponent(slug)}`;
}

export function buildRestaurantDashboardPath(restaurantIdOrSlug: string): string {
  const safeId = restaurantIdOrSlug.trim();
  if (!safeId) return "/admin";

  return `/admin?restaurantId=${encodeURIComponent(safeId)}`;
}
