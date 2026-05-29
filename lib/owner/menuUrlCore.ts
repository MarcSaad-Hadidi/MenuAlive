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

/**
 * Production public menu path served by app/menu/[slug].
 * Distinct from buildRestaurantMenuPath (which stays the /demo preview link
 * relied on by marketing pages and tests).
 */
export function buildPublicMenuPath(
  slugOrName: string,
  params?: { table?: string; zone?: string }
): string {
  const slug = slugifyRestaurantSlug(slugOrName);
  if (!slug) return "/demo";

  const query = new URLSearchParams();
  const table = params?.table?.toString().trim();
  const zone = params?.zone?.toString().trim();
  if (table) query.set("table", table.slice(0, 24));
  if (zone) query.set("zone", zone.slice(0, 24));

  const suffix = query.toString();
  return suffix
    ? `/menu/${encodeURIComponent(slug)}?${suffix}`
    : `/menu/${encodeURIComponent(slug)}`;
}

/**
 * Public secure QR redirect path. The token is opaque and resolved server-side
 * (app/q/[token]); it is never derived from the slug or a DB id.
 */
export function buildQrRedirectPath(token: string): string {
  return `/q/${encodeURIComponent(token)}`;
}
