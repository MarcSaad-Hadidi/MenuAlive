"use client";

import dynamic from "next/dynamic";
import { DynamicVideoText } from "@/components/DynamicVideoText";
import { frameConfig } from "@/lib/frameConfig";
import { videoChapters } from "@/lib/videoChapters";
import { useIsDesktopHero } from "@/components/landing/useIsDesktopHero";

const MobileLandingHero = dynamic(
  () =>
    import("@/components/landing/MobileLandingHero").then(
      (module) => module.MobileLandingHero
    ),
  {
    loading: () => <LandingHeroFallback />,
    ssr: false
  }
);

const DesktopLandingHero = dynamic(
  () =>
    import("@/components/landing/DesktopLandingHero").then(
      (module) => module.DesktopLandingHero
    ),
  {
    loading: () => <LandingHeroFallback />,
    ssr: false
  }
);

function LandingHeroFallback() {
  return (
    <section
      data-landing-hero-mode="pending"
      data-hero-engine="pending"
      className="relative h-[100svh] overflow-clip bg-[#080706]"
      aria-label="Experience Vistaire"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frameConfig.framePath(0)}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="video-readable-overlay absolute inset-0 z-10" />
      <div className="absolute inset-0 z-30 flex items-end px-5 pb-14 pt-28 sm:px-10 sm:pb-20 md:items-center md:pb-0 lg:px-16">
        <div className="mx-auto w-full max-w-7xl">
          <DynamicVideoText chapter={videoChapters[0]} />
        </div>
      </div>
    </section>
  );
}

export function ResponsiveLandingHero() {
  const isDesktop = useIsDesktopHero();

  if (isDesktop === null) {
    return <LandingHeroFallback />;
  }

  return isDesktop ? <DesktopLandingHero /> : <MobileLandingHero />;
}
