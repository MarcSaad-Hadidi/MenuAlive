import type { Dish } from "@/lib/demoMenuData";

type DishAssetVariant = {
  url?: unknown;
  bytes?: unknown;
  sha256?: unknown;
  validationStatus?: unknown;
};

export type DishAssetManifest = {
  restaurantSlug?: unknown;
  menuSlug?: unknown;
  dishSlug?: unknown;
  activeVersion?: unknown;
  status?: unknown;
  variants?: {
    web?: DishAssetVariant;
    mobile?: DishAssetVariant;
    arLite?: DishAssetVariant;
    iosUsdz?: DishAssetVariant;
  };
  validation?: {
    warnings?: unknown;
    fails?: unknown;
  };
};

export type DishModelAssetResolution = Pick<
  Dish,
  | "model3dUrl"
  | "webModel3dUrl"
  | "mobileModel3dUrl"
  | "arModel3dUrl"
  | "usdzUrl"
  | "arUsdzUrl"
  | "arVisualStatus"
> & {
  source: "legacy" | "manifest";
  manifestVersion?: string;
};

type ResolvableDish = Pick<
  Dish,
  | "slug"
  | "model3dUrl"
  | "webModel3dUrl"
  | "mobileModel3dUrl"
  | "arModel3dUrl"
  | "usdzUrl"
  | "arUsdzUrl"
  | "arVisualStatus"
>;

const RESTAURANT_MODEL_ROOT = "/models/restaurants/";
const STABLE_PUBLIC_URL_PATTERN = /^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^?#]+$/;

function legacyResolution(dish: ResolvableDish): DishModelAssetResolution {
  return {
    source: "legacy",
    model3dUrl: dish.model3dUrl,
    webModel3dUrl: dish.webModel3dUrl,
    mobileModel3dUrl: dish.mobileModel3dUrl,
    arModel3dUrl: dish.arModel3dUrl,
    usdzUrl: dish.usdzUrl,
    arUsdzUrl: dish.arUsdzUrl,
    arVisualStatus: dish.arVisualStatus
  };
}

function stableRestaurantVariantUrl(
  variant: DishAssetVariant | undefined,
  extension: ".glb" | ".usdz"
): string {
  const url = typeof variant?.url === "string" ? variant.url.trim() : "";
  if (!url) return "";
  if (!STABLE_PUBLIC_URL_PATTERN.test(url)) return "";
  if (!url.startsWith(RESTAURANT_MODEL_ROOT)) return "";
  if (!url.toLowerCase().endsWith(extension)) return "";
  return url;
}

function isUsableManifest(
  dish: ResolvableDish,
  manifest: DishAssetManifest | null | undefined
): manifest is DishAssetManifest & {
  dishSlug: string;
  activeVersion: string;
  variants: NonNullable<DishAssetManifest["variants"]>;
} {
  if (!manifest || typeof manifest !== "object") return false;
  if (manifest.dishSlug !== dish.slug) return false;
  if (typeof manifest.activeVersion !== "string" || !manifest.activeVersion.trim()) {
    return false;
  }
  if (!manifest.variants || typeof manifest.variants !== "object") return false;
  if (Array.isArray(manifest.validation?.fails) && manifest.validation.fails.length > 0) {
    return false;
  }
  return Boolean(
    stableRestaurantVariantUrl(manifest.variants.web, ".glb") ||
      stableRestaurantVariantUrl(manifest.variants.mobile, ".glb") ||
      stableRestaurantVariantUrl(manifest.variants.arLite, ".glb") ||
      stableRestaurantVariantUrl(manifest.variants.iosUsdz, ".usdz")
  );
}

function resolveQuickLookStatus(
  dish: ResolvableDish,
  iosUsdzUrl: string,
  manifest: DishAssetManifest
): Dish["arVisualStatus"] {
  if (!iosUsdzUrl) return dish.arVisualStatus;
  if (manifest.variants?.iosUsdz) {
    return manifest.variants.iosUsdz.validationStatus === "approved"
      ? "approved"
      : "needs-review";
  }
  if (dish.arVisualStatus === "approved") return "approved";
  if (manifest.variants?.iosUsdz?.validationStatus !== "approved") {
    return "needs-review";
  }
  if (manifest.status === "approved" || manifest.status === "published") {
    return "approved";
  }
  return "needs-review";
}

export function resolveDishModelAssets(
  dish: ResolvableDish,
  manifest?: DishAssetManifest | null
): DishModelAssetResolution {
  const legacy = legacyResolution(dish);
  if (!isUsableManifest(dish, manifest)) return legacy;

  const webModel3dUrl =
    stableRestaurantVariantUrl(manifest.variants.web, ".glb") ||
    legacy.webModel3dUrl;
  const mobileModel3dUrl =
    stableRestaurantVariantUrl(manifest.variants.mobile, ".glb") ||
    legacy.mobileModel3dUrl;
  const arModel3dUrl =
    stableRestaurantVariantUrl(manifest.variants.arLite, ".glb") ||
    legacy.arModel3dUrl;
  const arUsdzUrl =
    stableRestaurantVariantUrl(manifest.variants.iosUsdz, ".usdz") ||
    legacy.arUsdzUrl;

  return {
    ...legacy,
    source: "manifest",
    manifestVersion: manifest.activeVersion,
    webModel3dUrl,
    mobileModel3dUrl,
    arModel3dUrl,
    arUsdzUrl,
    arVisualStatus: resolveQuickLookStatus(dish, arUsdzUrl ?? "", manifest)
  };
}

export function applyDishModelAssets(
  dish: Dish,
  resolution: DishModelAssetResolution
): Dish {
  return {
    ...dish,
    model3dUrl: resolution.model3dUrl,
    webModel3dUrl: resolution.webModel3dUrl,
    mobileModel3dUrl: resolution.mobileModel3dUrl,
    arModel3dUrl: resolution.arModel3dUrl,
    usdzUrl: resolution.usdzUrl,
    arUsdzUrl: resolution.arUsdzUrl,
    arVisualStatus: resolution.arVisualStatus
  };
}
