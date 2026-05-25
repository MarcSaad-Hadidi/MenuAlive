import type { AnchorHTMLAttributes, ReactNode } from "react";
import { LiquidGlassShell } from "@/components/LiquidGlassShell";
import { liquidGlassButtonClasses } from "@/lib/liquidGlassButton";

type SecondaryButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  size?: "default" | "small";
  variant?: "secondary" | "ghost" | "accent";
  disabled?: boolean;
};

export function SecondaryButton({
  children,
  className = "",
  size = "default",
  variant = "secondary",
  disabled = false,
  ...props
}: SecondaryButtonProps) {
  const sizeClass = size === "small" ? "small" : "default";
  const classes = liquidGlassButtonClasses({
    variant,
    size: sizeClass,
    className: [
      size === "default" ? "text-sm sm:text-base" : "",
      disabled ? "liquid-glass-button-disabled" : "",
      className
    ]
      .filter(Boolean)
      .join(" ")
  });

  if (disabled) {
    return (
      <span className={classes} aria-disabled="true">
        <LiquidGlassShell>{children}</LiquidGlassShell>
      </span>
    );
  }

  return (
    <a className={classes} {...props}>
      <LiquidGlassShell>{children}</LiquidGlassShell>
    </a>
  );
}
