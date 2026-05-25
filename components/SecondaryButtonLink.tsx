import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LiquidGlassShell } from "@/components/LiquidGlassShell";
import { liquidGlassButtonClasses } from "@/lib/liquidGlassButton";

type SecondaryButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  size?: "default" | "small";
  variant?: "secondary" | "ghost" | "accent";
  disabled?: boolean;
};

export function SecondaryButtonLink({
  children,
  className = "",
  size = "default",
  variant = "secondary",
  disabled = false,
  ...props
}: SecondaryButtonLinkProps) {
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
    <Link className={classes} {...props}>
      <LiquidGlassShell>{children}</LiquidGlassShell>
    </Link>
  );
}
