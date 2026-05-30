import type { Dish } from "@/lib/demoMenuData";

export type ImmersiveDevice = "desktop" | "ios" | "android" | "unknown";
export type ImmersiveBrowser =
  | "chrome"
  | "safari"
  | "firefox"
  | "webview"
  | "in-app"
  | "unknown";
export type ImmersiveUserIntent = "none" | "view3d" | "ar";
export type ImmersiveVariantKind =
  | "none"
  | "poster"
  | "web"
  | "mobile"
  | "arLite"
  | "iosUsdz";

export type Dish3dVariant = {
  url: string;
  bytes?: number;
  sha256?: string;
  width?: number;
  height?: number;
  triangleCount?: number;
  vertexCount?: number;
  materialCount?: number;
  textureCount?: number;
  maxTextureSize?: number;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  arPlacement?: "floor" | "wall";
  arScale?: "fixed" | "auto";
  productionQuickLook?: boolean;
};

export type Dish3dManifest = {
  schemaVersion: 2;
  kind: "vistaire.dish-3d-manifest";
  restaurantSlug: string;
  menuSlug: string;
  dishSlug: string;
  activeVersion: string;
  status: "draft" | "review" | "approved" | "published" | "archived";
  validationStatus: "unvalidated" | "passed" | "warning" | "failed";
  variants: Partial<Record<"poster" | "web" | "mobile" | "arLite" | "iosUsdz", Dish3dVariant>>;
  quality?: {
    manualVisualApprovalRequired?: boolean;
    manualVisualApproved?: boolean;
  };
};

export type ImmersiveVariantSelection = {
  kind: ImmersiveVariantKind;
  url: string;
  shouldLoadModel: boolean;
  requiresConfirmation: boolean;
  reason: string;
  message: string;
};

type DemoDish3dFields = Pick<
  Dish,
  | "slug"
  | "model3dUrl"
  | "webModel3dUrl"
  | "arModel3dUrl"
  | "arUsdzUrl"
  | "image"
>;

type SelectImmersiveVariantInput = {
  manifest: Dish3dManifest | null | undefined;
  device: ImmersiveDevice;
  browser: ImmersiveBrowser;
  viewport?: { width?: number; height?: number };
  connection?: { effectiveType?: string; saveData?: boolean };
  userIntent: ImmersiveUserIntent;
  prefersReducedMotion?: boolean;
  allowedExternalOrigins?: string[];
};

const DEMO_RESTAURANT_SLUG = "maison-elyse";
const DEMO_MENU_SLUG = "demo";
const DEMO_ACTIVE_VERSION = "legacy-demo";

function cleanUrl(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function hasSafeLocalAssetUrl(url: string): boolean {
  return (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\") &&
    !url.includes("..") &&
    !/[?#]/.test(url)
  );
}

function hasAllowedExternalAssetUrl(url: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      !parsed.search &&
      !parsed.hash &&
      allowedOrigins.includes(parsed.origin)
    );
  } catch {
    return false;
  }
}

export function isSafe3dAssetUrl(url: string, allowedExternalOrigins: string[] = []): boolean {
  if (!url) return false;
  return hasSafeLocalAssetUrl(url) || hasAllowedExternalAssetUrl(url, allowedExternalOrigins);
}

function safeVariant(
  variant: Dish3dVariant | undefined,
  allowedExternalOrigins: string[]
): Dish3dVariant | null {
  if (!variant?.url) return null;
  return isSafe3dAssetUrl(variant.url, allowedExternalOrigins) ? variant : null;
}

function isManifestRuntimeEligible(
  manifest: Dish3dManifest | null | undefined
): manifest is Dish3dManifest {
  if (!manifest) return false;
  return (
    manifest.kind === "vistaire.dish-3d-manifest" &&
    manifest.schemaVersion === 2 &&
    (manifest.status === "approved" || manifest.status === "published") &&
    manifest.validationStatus === "passed"
  );
}

function isSlowOrMeteredConnection(connection?: SelectImmersiveVariantInput["connection"]): boolean {
  if (connection?.saveData) return true;
  return /^(slow-2g|2g|3g)$/i.test(connection?.effectiveType ?? "");
}

function selection(
  kind: ImmersiveVariantKind,
  variant: Dish3dVariant | null,
  extra: Partial<ImmersiveVariantSelection> = {}
): ImmersiveVariantSelection {
  return {
    kind,
    url: variant?.url ?? "",
    shouldLoadModel: kind === "web" || kind === "mobile" || kind === "arLite",
    requiresConfirmation: false,
    reason: kind,
    message: "",
    ...extra
  };
}

function firstAvailable(
  manifest: Dish3dManifest,
  keys: Array<"mobile" | "web" | "arLite">,
  allowedExternalOrigins: string[]
): Dish3dVariant | null {
  for (const key of keys) {
    const variant = safeVariant(manifest.variants[key], allowedExternalOrigins);
    if (variant) return variant;
  }
  return null;
}

export function buildDemoDish3dManifest(dish: DemoDish3dFields): Dish3dManifest {
  const webUrl = cleanUrl(dish.webModel3dUrl) || cleanUrl(dish.model3dUrl);
  const arLiteUrl = cleanUrl(dish.arModel3dUrl);
  const mobileUrl = arLiteUrl || webUrl;
  const iosUsdzUrl = cleanUrl(dish.arUsdzUrl);
  const posterUrl = cleanUrl(dish.image);
  const variants: Dish3dManifest["variants"] = {};

  if (posterUrl) variants.poster = { url: posterUrl };
  if (webUrl) variants.web = { url: webUrl };
  if (mobileUrl) variants.mobile = { url: mobileUrl };
  if (arLiteUrl) {
    variants.arLite = {
      url: arLiteUrl,
      arPlacement: "floor",
      arScale: "fixed",
      extensionsRequired: []
    };
  }
  if (iosUsdzUrl) {
    variants.iosUsdz = {
      url: iosUsdzUrl,
      productionQuickLook: true
    };
  }

  const hasModel = Boolean(webUrl || mobileUrl || arLiteUrl || iosUsdzUrl);

  return {
    schemaVersion: 2,
    kind: "vistaire.dish-3d-manifest",
    restaurantSlug: DEMO_RESTAURANT_SLUG,
    menuSlug: DEMO_MENU_SLUG,
    dishSlug: dish.slug,
    activeVersion: DEMO_ACTIVE_VERSION,
    status: hasModel ? "approved" : "draft",
    validationStatus: hasModel ? "passed" : "unvalidated",
    variants,
    quality: {
      manualVisualApprovalRequired: false,
      manualVisualApproved: true
    }
  };
}

export function selectImmersiveVariant({
  manifest,
  device,
  browser,
  connection,
  userIntent,
  allowedExternalOrigins = []
}: SelectImmersiveVariantInput): ImmersiveVariantSelection {
  if (!isManifestRuntimeEligible(manifest)) {
    return selection("none", null, {
      shouldLoadModel: false,
      reason: "manifest-not-runtime-eligible",
      message: "Ce plat sera bientot disponible en 3D."
    });
  }
  const runtimeManifest = manifest;

  const poster = safeVariant(runtimeManifest.variants.poster, allowedExternalOrigins);
  if (userIntent === "none") {
    return selection("poster", poster, {
      shouldLoadModel: false,
      reason: "waiting-for-user-intent"
    });
  }

  if (isSlowOrMeteredConnection(connection)) {
    return selection("poster", poster, {
      shouldLoadModel: false,
      requiresConfirmation: true,
      reason: "slow-or-metered-network",
      message: "Reseau lent detecte : charger la vue 3D ?"
    });
  }

  if (userIntent === "ar") {
    if (device === "ios") {
      const iosUsdz = safeVariant(runtimeManifest.variants.iosUsdz, allowedExternalOrigins);
      if (browser === "safari" && iosUsdz) {
        return selection("iosUsdz", iosUsdz, {
          shouldLoadModel: false,
          reason: "ios-safari-quick-look"
        });
      }

      const fallback = firstAvailable(runtimeManifest, ["mobile", "web"], allowedExternalOrigins);
      return selection("mobile", fallback, {
        reason: iosUsdz ? "ios-non-safari-fallback" : "ios-usdz-missing",
        message: iosUsdz
          ? "Ouvrir dans Safari pour la realite augmentee. La 3D reste disponible ici."
          : "La 3D reste disponible ici."
      });
    }

    if (device === "android") {
      const arLite = safeVariant(runtimeManifest.variants.arLite, allowedExternalOrigins);
      if (browser === "chrome" && arLite) {
        return selection("arLite", arLite, {
          reason: "android-scene-viewer-ar-lite"
        });
      }

      const fallback = firstAvailable(runtimeManifest, ["mobile", "web"], allowedExternalOrigins);
      return selection("mobile", fallback, {
        reason: arLite ? "android-browser-fallback" : "android-ar-lite-missing",
        message: "La 3D reste disponible ici."
      });
    }
  }

  if (device === "desktop") {
    const web = safeVariant(runtimeManifest.variants.web, allowedExternalOrigins);
    if (!web && cleanUrl(runtimeManifest.variants.web?.url)) {
      return selection("none", null, {
        shouldLoadModel: false,
        reason: "unsafe-web-variant-url"
      });
    }
    return selection("web", web, {
      reason: "desktop-web"
    });
  }

  const mobile = firstAvailable(runtimeManifest, ["mobile", "web"], allowedExternalOrigins);
  if (
    !mobile &&
    cleanUrl(runtimeManifest.variants.mobile?.url || runtimeManifest.variants.web?.url)
  ) {
    return selection("none", null, {
      shouldLoadModel: false,
      reason: "unsafe-mobile-variant-url"
    });
  }

  return selection("mobile", mobile, {
    reason: "mobile-preview"
  });
}
