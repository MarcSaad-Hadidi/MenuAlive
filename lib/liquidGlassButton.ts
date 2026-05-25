export type LiquidGlassButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "icon";

export type LiquidGlassButtonSize = "default" | "small" | "icon";

/** Shared liquid glass base — always pair with a variant class. */
export const liquidGlassButtonBase = "liquid-glass-button glass-focus-ring";

const variantClass: Record<LiquidGlassButtonVariant, string> = {
  primary: "liquid-glass-button-primary glass-button-primary",
  secondary: "liquid-glass-button-secondary glass-button-secondary",
  ghost: "liquid-glass-button-ghost glass-button-ghost",
  accent: "liquid-glass-button-accent glass-button-accent",
  icon: "liquid-glass-button-icon glass-button-secondary"
};

const sizeClass: Record<LiquidGlassButtonSize, string> = {
  default: "min-h-12 px-6 py-3 text-base",
  small: "h-10 px-4 text-sm",
  icon: "liquid-glass-button-icon-size"
};

const shapeClass: Record<LiquidGlassButtonVariant, string> = {
  primary: "rounded-full",
  secondary: "rounded-full",
  ghost: "rounded-full",
  accent: "rounded-full",
  icon: "rounded-2xl"
};

export function liquidGlassButtonClasses({
  variant = "primary",
  size = "default",
  className = ""
}: {
  variant?: LiquidGlassButtonVariant;
  size?: LiquidGlassButtonSize;
  className?: string;
}): string {
  const resolvedSize = variant === "icon" ? "icon" : size;
  return [
    liquidGlassButtonBase,
    variantClass[variant],
    shapeClass[variant],
    sizeClass[resolvedSize],
    "inline-flex max-w-full items-center justify-center text-center font-semibold leading-tight",
    className
  ]
    .filter(Boolean)
    .join(" ");
}
