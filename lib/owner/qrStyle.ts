import type { OwnerQrStyle } from "@/lib/owner/types";

export const OWNER_QR_LOGO_MIN_PERCENT = 10;
export const OWNER_QR_LOGO_MAX_PERCENT = 22;
export const OWNER_QR_PADDING_MIN = 1;
export const OWNER_QR_PADDING_MAX = 8;

export const DEFAULT_OWNER_QR_STYLE: OwnerQrStyle = {
  foregroundColor: "#080706",
  backgroundColor: "#fff8ea",
  accentColor: "#e8cf9b",
  logoMode: "monogram",
  logoText: "V",
  logoSizePercent: 16,
  padding: 3,
  errorCorrectionLevel: "H"
};

export type OwnerQrPreset = {
  id: string;
  label: string;
  style: Pick<
    OwnerQrStyle,
    "foregroundColor" | "backgroundColor" | "accentColor"
  >;
};

export const OWNER_QR_PRESETS: OwnerQrPreset[] = [
  {
    id: "vistaire-classique",
    label: "Vistaire Classique",
    style: {
      foregroundColor: "#080706",
      backgroundColor: "#fff8ea",
      accentColor: "#e8cf9b"
    }
  },
  {
    id: "noir-creme",
    label: "Noir / Crème",
    style: {
      foregroundColor: "#100c08",
      backgroundColor: "#f7efe0",
      accentColor: "#c8a86a"
    }
  },
  {
    id: "champagne",
    label: "Champagne",
    style: {
      foregroundColor: "#2c2009",
      backgroundColor: "#f4e6c4",
      accentColor: "#b6914c"
    }
  },
  {
    id: "minimal-noir",
    label: "Minimal Noir",
    style: {
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      accentColor: "#1c1c1c"
    }
  }
];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function expandHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function relativeLuminance(hex: string): number {
  const value = expandHex(hex).slice(1);
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * WCAG-style contrast ratio between QR foreground and background.
 * QR scanners need strong contrast; below ~3:1 reliability drops sharply.
 */
export function qrContrastRatio(style: Pick<OwnerQrStyle, "foregroundColor" | "backgroundColor">): number {
  if (!isHexColor(style.foregroundColor) || !isHexColor(style.backgroundColor)) {
    return 0;
  }
  const a = relativeLuminance(style.foregroundColor);
  const b = relativeLuminance(style.backgroundColor);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export const QR_MIN_SAFE_CONTRAST = 3;

/**
 * Normalizes any untrusted partial style into a safe, scannable OwnerQrStyle.
 * Forces error correction H when a logo is present and clamps logo/padding.
 */
export function normalizeOwnerQrStyle(input: unknown): OwnerQrStyle {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const logoMode: OwnerQrStyle["logoMode"] =
    candidate.logoMode === "monogram" ||
    candidate.logoMode === "imageUrl" ||
    candidate.logoMode === "none"
      ? candidate.logoMode
      : DEFAULT_OWNER_QR_STYLE.logoMode;

  const requestedLevel = candidate.errorCorrectionLevel;
  const baseLevel: OwnerQrStyle["errorCorrectionLevel"] =
    requestedLevel === "M" || requestedLevel === "Q" || requestedLevel === "H"
      ? requestedLevel
      : DEFAULT_OWNER_QR_STYLE.errorCorrectionLevel;
  // A logo punches a hole in the symbol: force high error correction.
  const errorCorrectionLevel: OwnerQrStyle["errorCorrectionLevel"] =
    logoMode === "none" ? baseLevel : "H";

  const logoImageUrl =
    typeof candidate.logoImageUrl === "string"
      ? candidate.logoImageUrl.slice(0, 600)
      : undefined;

  return {
    foregroundColor: isHexColor(candidate.foregroundColor)
      ? candidate.foregroundColor
      : DEFAULT_OWNER_QR_STYLE.foregroundColor,
    backgroundColor: isHexColor(candidate.backgroundColor)
      ? candidate.backgroundColor
      : DEFAULT_OWNER_QR_STYLE.backgroundColor,
    accentColor: isHexColor(candidate.accentColor)
      ? candidate.accentColor
      : DEFAULT_OWNER_QR_STYLE.accentColor,
    logoMode,
    logoText:
      typeof candidate.logoText === "string" && candidate.logoText.trim()
        ? candidate.logoText.trim().slice(0, 4)
        : DEFAULT_OWNER_QR_STYLE.logoText,
    ...(logoMode === "imageUrl" && logoImageUrl ? { logoImageUrl } : {}),
    logoSizePercent: Math.round(
      clamp(
        Number(candidate.logoSizePercent ?? DEFAULT_OWNER_QR_STYLE.logoSizePercent),
        OWNER_QR_LOGO_MIN_PERCENT,
        OWNER_QR_LOGO_MAX_PERCENT
      )
    ),
    padding: Math.round(
      clamp(
        Number(candidate.padding ?? DEFAULT_OWNER_QR_STYLE.padding),
        OWNER_QR_PADDING_MIN,
        OWNER_QR_PADDING_MAX
      )
    ),
    errorCorrectionLevel
  };
}

export function monogramFromName(name: string): string {
  const cleaned = name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").trim();
  if (!cleaned) return "V";
  const words = cleaned.split(/\s+/).slice(0, 2);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");
  return (initials || cleaned.charAt(0).toUpperCase() || "V").slice(0, 3);
}
