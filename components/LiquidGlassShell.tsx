import type { ReactNode } from "react";

/** Internal glass layers (specular, depth, rim) — pairs with liquid-glass-button CSS. */
export function LiquidGlassShell({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="liquid-glass-layer liquid-glass-layer-specular" aria-hidden />
      <span className="liquid-glass-layer liquid-glass-layer-depth" aria-hidden />
      <span className="liquid-glass-layer liquid-glass-layer-rim" aria-hidden />
      <span className="liquid-glass-label relative z-[2]">{children}</span>
    </>
  );
}
