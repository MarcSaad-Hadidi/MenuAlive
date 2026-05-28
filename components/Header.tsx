"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { trackMenuEvent } from "@/lib/analytics/client";
import { VISTAIRE_GLASS_CTA } from "@/lib/vistaireGlass";

export function Header({ userSlot }: { userSlot?: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isDemoRoute = pathname.startsWith("/demo");
  const isAdminRoute = pathname.startsWith("/admin");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isPrivateRoute = isDemoRoute || isAdminRoute || isOwnerRoute;

  const experienceHref = isHome ? "#experience" : "/#experience";
  const beneficesHref = isHome ? "#benefices" : "/#benefices";
  const logoHref = isHome ? "#experience" : "/";

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-transparent px-2 pb-2 pt-3 sm:px-6 sm:pb-3 sm:pt-4">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 rounded-full border border-white/25 bg-transparent px-3 py-2 shadow-[0_24px_70px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,250,240,0.18),inset_0_-1px_0_rgba(255,250,240,0.1)] backdrop-blur-[5px] backdrop-saturate-[110%] sm:min-h-16 sm:gap-4 sm:px-5 sm:py-2.5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={logoHref}
            className="shrink-0 font-display text-lg leading-none text-cream outline-none transition hover:text-champagne focus-visible:ring-2 focus-visible:ring-champagne sm:text-2xl"
            aria-label={
              isHome
                ? "Vistaire, accueil de la page"
                : "Vistaire, retour à la page d'accueil"
            }
          >
            Vistaire
          </Link>
          {isPrivateRoute ? (
            <span className="hidden truncate border-l border-white/15 pl-3 text-[11px] font-medium uppercase tracking-[0.18em] text-champagne/85 sm:inline">
              {isOwnerRoute
                ? "Pilotage Vistaire"
                : isAdminRoute
                  ? "Aperçu restaurateur"
                  : "Maison Élyse"}
            </span>
          ) : null}
        </div>

        {!isPrivateRoute ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 text-sm text-[#dbcdb8] md:flex lg:gap-8">
            <Link
              className="transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              href={experienceHref}
            >
              Expérience
            </Link>
            <Link
              className="transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              href={beneficesHref}
            >
              Bénéfices
            </Link>
            <Link
              className="transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              href={isHome ? "#guides" : "/#guides"}
            >
              Guides
            </Link>
          </div>
        ) : (
          <div className="hidden flex-1 justify-center sm:flex" aria-hidden />
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isDemoRoute ? (
            <>
              <Link
                href="/admin"
                onClick={() =>
                  trackMenuEvent({
                    eventName: "dashboard_demo_opened",
                    ctaName: "demo_header"
                  })
                }
                className={`inline-flex min-h-10 items-center justify-center rounded-full px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne sm:px-4 ${VISTAIRE_GLASS_CTA}`}
                aria-label="Ouvrir l'aperçu restaurateur"
              >
                <span className="hidden min-[430px]:inline">Aperçu restaurateur</span>
                <span className="min-[430px]:hidden">Aperçu</span>
              </Link>
              <Link
                href="/"
                className="hidden text-xs font-medium text-champagne/90 transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne min-[390px]:inline sm:text-sm"
              >
                Accueil Vistaire
              </Link>
            </>
          ) : isAdminRoute ? (
            <>
              <Link
                href="/demo"
                className="text-xs font-medium text-champagne/90 transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne sm:text-sm"
              >
                Menu client
              </Link>
              <Link
                href="/"
                className="hidden text-xs font-medium text-[#cdbfa9] transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne min-[390px]:inline sm:text-sm"
              >
                Accueil Vistaire
              </Link>
            </>
          ) : isOwnerRoute ? (
            <>
              <Link
                href="/admin"
                className="hidden text-xs font-medium text-champagne/90 transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne min-[390px]:inline sm:text-sm"
              >
                Aperçu restaurateur
              </Link>
              <Link
                href="/demo"
                className="text-xs font-medium text-[#cdbfa9] transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne sm:text-sm"
              >
                Menu exemple
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/apercu-restaurateur"
                onClick={() =>
                  trackMenuEvent({
                    eventName: "dashboard_demo_opened",
                    ctaName: "landing_header"
                  })
                }
                className={`hidden min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne lg:inline-flex ${VISTAIRE_GLASS_CTA}`}
              >
                Aperçu restaurateur
              </Link>
              <PrimaryButton
                href="/demo"
                size="small"
                aria-label="Voir le menu client Vistaire"
              >
                <span className="hidden sm:inline">Voir le menu client</span>
                <span className="sm:hidden">Menu client</span>
              </PrimaryButton>
            </>
          )}
          {isOwnerRoute && userSlot ? (
            <div className="ml-1 flex items-center">
              {userSlot}
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
