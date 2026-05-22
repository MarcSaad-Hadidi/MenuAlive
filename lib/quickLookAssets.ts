import type { Dish } from "@/lib/demoMenuData";

type QuickLookDish = Pick<Dish, "arUsdzUrl" | "arVisualStatus">;

const KNOWN_FAILED_REAL_DEVICE_USDZ_URLS = new Set([
  "/models/demo/ar-lite/ravioles-chevre-miel-ios-quicklook-ultra.usdz",
  "/models/demo/ar-lite/souffle-chocolat-ios-quicklook-ultra.usdz"
]);

export function resolveActiveQuickLookUsdzUrl(dish: QuickLookDish): string {
  if (dish.arVisualStatus !== "approved") return "";
  const url = dish.arUsdzUrl?.trim() ?? "";
  if (!url) return "";
  if (/[?#]/.test(url)) return "";
  if (!url.startsWith("/models/demo/ar-lite/")) return "";
  if (!url.endsWith(".usdz")) return "";
  if (KNOWN_FAILED_REAL_DEVICE_USDZ_URLS.has(url)) return "";
  return url;
}

export function hasActiveQuickLookUsdzUrl(dish: QuickLookDish): boolean {
  return Boolean(resolveActiveQuickLookUsdzUrl(dish));
}
