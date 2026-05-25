import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LiquidGlassShell } from "@/components/LiquidGlassShell";
import { liquidGlassButtonClasses } from "@/lib/liquidGlassButton";

type GlassIconButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  "aria-label": string;
};

export function GlassIconButtonLink({
  children,
  className = "",
  ...props
}: GlassIconButtonLinkProps) {
  const classes = liquidGlassButtonClasses({
    variant: "icon",
    className
  });

  return (
    <Link className={classes} {...props}>
      <LiquidGlassShell>{children}</LiquidGlassShell>
    </Link>
  );
}
