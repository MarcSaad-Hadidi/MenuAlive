import type { AnchorHTMLAttributes, ReactNode } from "react";
import { VISTAIRE_GLASS_CTA } from "@/lib/vistaireGlass";

type PrimaryButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  size?: "default" | "small";
};

export function PrimaryButton({
  children,
  className = "",
  size = "default",
  ...props
}: PrimaryButtonProps) {
  const sizeClass =
    size === "small"
      ? "h-10 px-4 text-sm"
      : "min-h-12 px-6 py-3 text-base";

  return (
    <a
      className={`inline-flex max-w-full items-center justify-center rounded-full text-center font-semibold leading-tight transition duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne ${VISTAIRE_GLASS_CTA} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
