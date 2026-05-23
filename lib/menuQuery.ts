import type { Allergen, Dish } from "@/lib/demoMenuData";

/** Slug de l’onglet « Tous » : aucun filtre par catégorie. */
export const MENU_ALL_CATEGORY_SLUG = "tous" as const;

/** Normalise pour recherche insensible à la casse. */
export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

export function dishMatchesSearch(dish: Dish, rawQuery: string): boolean {
  const q = normalizeSearchText(rawQuery);
  if (!q) return true;

  const haystack = [
    dish.name,
    dish.shortDescription,
    dish.ingredients.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

/** True when a dish has a web 3D or iOS AR asset. */
const KNOWN_FAILED_REAL_DEVICE_USDZ_URLS = new Set([
  "/models/demo/ar-lite/ravioles-chevre-miel-ios-quicklook-ultra.usdz",
  "/models/demo/ar-lite/souffle-chocolat-ios-quicklook-ultra.usdz"
]);

function isActiveQuickLookUsdzUrl(
  dish: Pick<Dish, "arUsdzUrl" | "arVisualStatus">
): boolean {
  if (dish.arVisualStatus !== "approved") return false;
  const url = dish.arUsdzUrl?.trim() ?? "";
  if (!url) return false;
  if (!url.endsWith(".usdz")) return false;
  if (/[?#]/.test(url)) return false;
  if (
    !url.startsWith("/models/demo/ar-lite/") &&
    !url.startsWith("/models/restaurants/")
  ) {
    return false;
  }
  return !KNOWN_FAILED_REAL_DEVICE_USDZ_URLS.has(url);
}

export function dishHasImmersiveAsset(
  dish: Pick<
    Dish,
    | "model3dUrl"
    | "webModel3dUrl"
    | "mobileModel3dUrl"
    | "arModel3dUrl"
    | "usdzUrl"
    | "arUsdzUrl"
    | "arVisualStatus"
  >
): boolean {
  return Boolean(
    dish.arModel3dUrl?.trim() ||
      dish.mobileModel3dUrl?.trim() ||
      dish.webModel3dUrl?.trim() ||
      dish.model3dUrl?.trim() ||
      isActiveQuickLookUsdzUrl(dish)
  );
}

export type MenuFilterState = {
  signatureOnly: boolean;
  recommendedOnly: boolean;
  availableOnly: boolean;
  /** Keep dishes with a web 3D or iOS AR asset. */
  with3dOnly: boolean;
  /** Exclure les plats contenant cet allergène (“sans …”). */
  excludeAllergen: Allergen | null;
};

export const defaultMenuFilterState = (): MenuFilterState => ({
  signatureOnly: false,
  recommendedOnly: false,
  availableOnly: false,
  with3dOnly: false,
  excludeAllergen: null
});

export function applyMenuFilters(
  dishes: Dish[],
  filters: MenuFilterState
): Dish[] {
  return dishes.filter((dish) => {
    if (filters.signatureOnly && !dish.isSignature) return false;
    if (filters.recommendedOnly && !dish.isRecommended) return false;
    if (filters.availableOnly && !dish.isAvailable) return false;
    if (filters.with3dOnly && !dishHasImmersiveAsset(dish)) return false;
    if (
      filters.excludeAllergen &&
      dish.allergens.includes(filters.excludeAllergen)
    ) {
      return false;
    }
    return true;
  });
}

export function hasActiveFilters(filters: MenuFilterState): boolean {
  return (
    filters.signatureOnly ||
    filters.recommendedOnly ||
    filters.availableOnly ||
    filters.with3dOnly ||
    filters.excludeAllergen !== null
  );
}
