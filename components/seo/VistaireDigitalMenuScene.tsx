import Image from "next/image";
import { AllergenBadge } from "@/components/dish/AllergenBadge";
import type {
  CompareCategoryTab,
  CompareDishPreview,
  PdfComparePreviewData
} from "@/lib/pdfComparePreviewData";

export type VistaireDigitalMenuSceneProps = {
  preview: PdfComparePreviewData;
  layerLabel?: string;
  showLayerLabel?: boolean;
  /** Adds cmb-* classes for the Cinematic Menu Bloom timeline. */
  bloomLayers?: boolean;
  className?: string;
};

function CompareCategoryChip({
  tab,
  selected
}: {
  tab: CompareCategoryTab;
  selected: boolean;
}) {
  return (
    <span
      className={`inline-flex min-h-[28px] max-w-full items-center justify-center whitespace-nowrap rounded-full border px-2 pb-[5px] pt-[3px] text-[clamp(0.48rem,2.2vw,0.62rem)] font-medium leading-[1.2] tracking-wide ${
        selected
          ? "border-champagne/55 bg-champagne/[0.15] text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-champagne/25"
          : "border-white/[0.12] bg-black/45 text-[#d1c2aa]"
      }`}
    >
      {tab.name}
    </span>
  );
}

function CompareDishCardPreview({
  dish,
  priorityImage,
  bloomLayers,
  dishDelay
}: {
  dish: CompareDishPreview;
  priorityImage?: boolean;
  bloomLayers?: boolean;
  dishDelay?: string;
}) {
  return (
    <article
      aria-hidden
      className={`overflow-hidden rounded-xl bg-gradient-to-b from-[#15110e]/98 to-[#080706] shadow-[0_0_0_1px_rgba(255,255,255,0.055),0_8px_32px_rgba(0,0,0,0.38)] ${
        bloomLayers ? "cmb-dish" : ""
      }`}
      style={bloomLayers && dishDelay ? { ["--cmb-delay" as string]: dishDelay } : undefined}
    >
      <div className="relative aspect-[4/3] min-h-[88px] w-full shrink-0 overflow-hidden bg-[#12100e]">
        {dish.image ? (
          <>
            <Image
              src={dish.image}
              alt={dish.imageAlt}
              fill
              priority={priorityImage}
              sizes="(max-width: 640px) 92vw, 380px"
              className="object-cover"
              style={{ objectPosition: dish.imageObjectPosition }}
              quality={90}
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10"
              aria-hidden
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 p-2.5 pt-2">
        <div className="flex flex-wrap gap-1">
          {dish.isSignature ? (
            <span className="rounded border border-champagne/35 bg-champagne/[0.08] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-champagne">
              Signature
            </span>
          ) : null}
          {dish.isRecommended ? (
            <span className="rounded border border-white/14 bg-white/[0.05] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-cream/95">
              Recommandé
            </span>
          ) : null}
          {dish.has3d ? (
            <span
              className={`rounded border border-champagne/30 bg-black/45 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-champagne/95 ${
                bloomLayers ? "cmb-badge" : ""
              }`}
              style={
                bloomLayers
                  ? { ["--cmb-delay" as string]: "2280ms" }
                  : undefined
              }
            >
              3D
            </span>
          ) : null}
        </div>

        <h4 className="font-display text-[clamp(0.62rem,2.8vw,0.82rem)] font-normal leading-[1.3] text-cream [overflow-wrap:anywhere]">
          <span className="line-clamp-2">{dish.name}</span>
        </h4>

        <p className="font-display text-[clamp(0.68rem,3vw,0.82rem)] tabular-nums leading-none text-champagne">
          {dish.price}
        </p>

        <p className="line-clamp-2 text-[clamp(0.44rem,2vw,0.58rem)] leading-[1.42] text-[#b0a08c]">
          {dish.shortDescription}
        </p>

        {dish.allergens.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {dish.allergens.map((allergen) => (
              <AllergenBadge key={allergen} allergen={allergen} compact />
            ))}
          </div>
        ) : null}

        <span
          className={`inline-flex min-h-8 w-full items-center justify-center rounded-lg bg-champagne/[0.12] text-[clamp(0.44rem,2vw,0.58rem)] font-semibold text-cream ring-1 ring-inset ring-champagne/35 ${
            bloomLayers ? "cmb-cta" : ""
          }`}
          style={
            bloomLayers ? { ["--cmb-delay" as string]: "2480ms" } : undefined
          }
        >
          Voir le plat
        </span>
      </div>
    </article>
  );
}

function VistaireLayerLabel({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="absolute right-[5%] top-[6%] z-10 inline-flex items-center gap-1 rounded-full border border-champagne/40 bg-[#0a0706]/88 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-champagne sm:text-[10px]"
    >
      <span className="h-1 w-1 rounded-full bg-champagne/80" />
      {label}
    </span>
  );
}

export function VistaireDigitalMenuScene({
  preview,
  layerLabel = "Vistaire",
  showLayerLabel = true,
  bloomLayers = false,
  className = ""
}: VistaireDigitalMenuSceneProps) {
  const { restaurant, categoryTabs, activeCategorySlug, vistaireDishes } =
    preview;

  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden bg-[#080605] text-cream ${className}`}
    >
      <header
        className={`relative shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-[#0c0a08] via-[#080706] to-[#080706] px-[4%] pb-[3%] pt-[5%] ${
          bloomLayers ? "cmb-layer" : ""
        }`}
        style={
          bloomLayers ? { ["--cmb-delay" as string]: "780ms" } : undefined
        }
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(217,184,121,0.085),transparent_55%)]" />
        <div className="relative text-center">
          <p className="text-[clamp(0.38rem,1.8vw,0.48rem)] font-semibold uppercase tracking-[0.24em] text-champagne/80">
            Menu client
          </p>
          <p className="mt-1.5 font-display text-[clamp(0.72rem,3.4vw,0.92rem)] font-normal leading-[1.12] tracking-tight text-cream">
            {restaurant.name}
          </p>
          <p className="mx-auto mt-1 line-clamp-2 max-w-[92%] text-[clamp(0.44rem,2vw,0.58rem)] leading-relaxed text-[#cfc1ab]">
            {restaurant.tagline}
          </p>
        </div>
      </header>

      <nav
        aria-hidden
        className={`relative shrink-0 border-b border-white/[0.08] bg-[#080706] px-2 py-2 ${
          bloomLayers ? "cmb-layer" : ""
        }`}
        style={
          bloomLayers ? { ["--cmb-delay" as string]: "920ms" } : undefined
        }
      >
        <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
          {categoryTabs.map((tab) => (
            <CompareCategoryChip
              key={tab.id}
              tab={tab}
              selected={tab.slug === activeCategorySlug}
            />
          ))}
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden bg-[#070504] px-2.5 pb-2 pt-2">
        <div className="flex flex-col gap-2.5">
          {vistaireDishes.map((dish, index) => (
            <CompareDishCardPreview
              key={dish.slug}
              dish={dish}
              priorityImage={index === 0}
              bloomLayers={bloomLayers}
              dishDelay={bloomLayers ? `${1080 + index * 180}ms` : undefined}
            />
          ))}
        </div>
      </div>

      {showLayerLabel ? <VistaireLayerLabel label={layerLabel} /> : null}
    </div>
  );
}
