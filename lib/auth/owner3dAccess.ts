type Owner3dAccessEnv = NodeJS.ProcessEnv & {
  VISTAIRE_OWNER_3D_RESTAURANT_SLUGS?: string;
  VISTAIRE_OWNER_3D_RESTAURANT_ACCESS?: string;
};

export type Owner3dAccessIdentity = {
  userId: string;
  emailAddresses: string[];
};

export type Owner3dRestaurantAccess =
  | { mode: "all" }
  | { mode: "limited"; slugs: Set<string> }
  | { mode: "none" };

const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;

function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  return SLUG_PATTERN.test(slug) && !slug.includes("..") ? slug : "";
}

function splitList(value: string): string[] {
  return value
    .split(/[\s,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function accessFromSlugList(value?: string): Owner3dRestaurantAccess {
  const raw = value?.trim() ?? "";
  if (!raw) return { mode: "none" };

  const entries = splitList(raw);
  if (entries.includes("*")) return { mode: "all" };

  const slugs = new Set(entries.map(normalizeSlug).filter(Boolean));
  return slugs.size > 0 ? { mode: "limited", slugs } : { mode: "none" };
}

function ownerKeys(owner: Owner3dAccessIdentity): Set<string> {
  return new Set([
    owner.userId.trim().toLowerCase(),
    ...owner.emailAddresses.map((email) => email.trim().toLowerCase())
  ].filter(Boolean));
}

function matchingPerOwnerAccess(
  owner: Owner3dAccessIdentity,
  env: Owner3dAccessEnv
): Owner3dRestaurantAccess | null {
  const raw = env.VISTAIRE_OWNER_3D_RESTAURANT_ACCESS?.trim();
  if (!raw) return null;

  const keys = ownerKeys(owner);
  for (const entry of raw.split(/[;\n]+/)) {
    const [rawKey, rawSlugs] = entry.split(/[:=]/, 2);
    const key = rawKey?.trim().toLowerCase();
    if (!key || !rawSlugs || !keys.has(key)) continue;
    return accessFromSlugList(rawSlugs);
  }

  return null;
}

export function getOwner3dRestaurantAccess(
  owner: Owner3dAccessIdentity,
  env: Owner3dAccessEnv = process.env
): Owner3dRestaurantAccess {
  return (
    matchingPerOwnerAccess(owner, env) ??
    accessFromSlugList(env.VISTAIRE_OWNER_3D_RESTAURANT_SLUGS)
  );
}

export function ownerCanAccess3dRestaurant(
  owner: Owner3dAccessIdentity,
  restaurantSlug: string,
  env: Owner3dAccessEnv = process.env
): boolean {
  const access = getOwner3dRestaurantAccess(owner, env);
  if (access.mode === "all") return true;
  if (access.mode === "none") return false;

  const slug = normalizeSlug(restaurantSlug);
  return Boolean(slug && access.slugs.has(slug));
}

export function owner3dAccessDeniedMessage(): string {
  return "Owner 3D/AR restaurant access is not configured for this restaurant.";
}

export function filterOwner3dAccessibleItems<T extends { restaurantSlug: string }>(
  owner: Owner3dAccessIdentity,
  items: T[],
  env: Owner3dAccessEnv = process.env
): T[] {
  const access = getOwner3dRestaurantAccess(owner, env);
  if (access.mode === "all") return items;
  if (access.mode === "none") return [];

  return items.filter((item) => access.slugs.has(item.restaurantSlug));
}
