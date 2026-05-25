"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { AllergenBadge } from "@/components/dish/AllergenBadge";
import type {
  CompareCategoryTab,
  CompareDishPreview,
  PdfComparePreviewData,
  PdfMenuSection
} from "@/lib/pdfComparePreviewData";

export type PdfVistaireCompareSliderProps = {
  preview: PdfComparePreviewData;
  pdfLabel?: string;
  vistaireLabel?: string;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function PdfRow({ name, price }: { name: string; price: string }) {
  return (
    <div className="flex items-end gap-1.5 font-sans leading-none text-[#2a2118]">
      <span className="min-w-0 flex-[1_1_62%] text-[11px] leading-[1.25]">{name}</span>
      <span
        aria-hidden
        className="mb-[3px] min-w-[8px] flex-1 border-b border-dotted border-[#2a2118]/45"
      />
      <span className="shrink-0 text-[11px] font-semibold leading-none text-[#1f1810]">
        {price}
      </span>
    </div>
  );
}

function PdfLayerLabel({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="absolute left-[5%] top-[6%] z-10 inline-flex items-center gap-1 rounded-full border border-[#3a2e21]/40 bg-[#f5ead8]/92 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#3a2e21] sm:text-[10px]"
    >
      <span className="h-1 w-1 rounded-full bg-[#3a2e21]/60" />
      {label}
    </span>
  );
}

function PdfScene({
  restaurantName,
  sections,
  pdfLabel
}: {
  restaurantName: string;
  sections: PdfMenuSection[];
  pdfLabel: string;
}) {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col bg-[#f3ece0]">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-[7%] pb-[3%] pt-[4.5%] pr-[9%] text-[#2a2118]">
        <div className="shrink-0 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.22em] text-[#5e4a36]">
            {restaurantName}
          </p>
          <h3 className="mt-1 font-display text-[19px] font-normal leading-none text-[#1f1810]">
            Carte
          </h3>
          <div className="mx-auto mt-1.5 h-px w-8 bg-[#5e4a36]/55" />
        </div>

        <div className="mt-2 flex min-h-0 flex-1 flex-col justify-start gap-1.5 overflow-hidden">
          {sections.map((section) => (
            <section key={section.title} className="shrink-0">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5e4a36]">
                {section.title}
              </p>
              <div className="mt-1 space-y-1">
                {section.rows.map((row) => (
                  <PdfRow key={`${section.title}-${row.name}`} {...row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <PdfLayerLabel label={pdfLabel} />
    </div>
  );
}

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
  priorityImage
}: {
  dish: CompareDishPreview;
  priorityImage?: boolean;
}) {
  return (
    <article
      aria-hidden
      className="overflow-hidden rounded-xl bg-gradient-to-b from-[#15110e]/98 to-[#080706] shadow-[0_0_0_1px_rgba(255,255,255,0.055),0_8px_32px_rgba(0,0,0,0.38)]"
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
            <span className="rounded border border-white/14 bg-white/[0.05] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-cream/95">
              Recommandé
            </span>
          ) : null}
          {dish.has3d ? (
            <span className="rounded border border-champagne/30 bg-black/45 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-champagne/95">
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

        <span className="inline-flex min-h-8 w-full items-center justify-center rounded-lg bg-champagne/[0.12] text-[clamp(0.44rem,2vw,0.58rem)] font-semibold text-cream ring-1 ring-inset ring-champagne/35">
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

function VistaireScene({
  preview,
  vistaireLabel
}: {
  preview: PdfComparePreviewData;
  vistaireLabel: string;
}) {
  const { restaurant, categoryTabs, activeCategorySlug, vistaireDishes } = preview;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#080605] text-cream">
      <header className="relative shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-[#0c0a08] via-[#080706] to-[#080706] px-[4%] pb-[3%] pt-[5%]">
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
        className="relative shrink-0 border-b border-white/[0.08] bg-[#080706] px-2 py-2"
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
            />
          ))}
        </div>
      </div>
      <VistaireLayerLabel label={vistaireLabel} />
    </div>
  );
}

function PhoneComparisonFrame({
  children,
  sliderId
}: {
  children: React.ReactNode;
  sliderId: string;
}) {
  return (
    <div data-phone-comparison="true" className="relative mx-auto w-full">
      <div className="relative rounded-[2.65rem] border-[9px] border-[#141416] bg-[#0c0c0e] shadow-[0_28px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.05)] sm:rounded-[2.85rem] sm:border-[10px]">
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-40 h-[18px] w-[36%] -translate-x-1/2 rounded-full bg-black/92 sm:top-2.5 sm:h-5 sm:w-[34%]"
          aria-hidden
        />
        <div
          id={`${sliderId}-screen`}
          className="relative overflow-hidden rounded-[2.15rem] bg-[#080706] sm:rounded-[2.35rem]"
        >
          {children}
        </div>
        <div className="flex justify-center py-1.5 sm:py-2" aria-hidden>
          <span className="h-[3px] w-[28%] rounded-full bg-white/18" />
        </div>
      </div>
    </div>
  );
}

export function PdfVistaireCompareSlider({
  preview,
  pdfLabel = "PDF",
  vistaireLabel = "Vistaire",
  className = ""
}: PdfVistaireCompareSliderProps) {
  const [split, setSplit] = useState(50);
  const [hasInteracted, setHasInteracted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragAxisRef = useRef<"pending" | "horizontal" | "vertical" | null>(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const sliderId = useId();

  const pdfPercent = Math.round(split);
  const vistairePercent = 100 - pdfPercent;

  const updateFromClientX = (clientX: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    setSplit(pct);
    if (!hasInteracted) setHasInteracted(true);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== undefined && event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    dragAxisRef.current = "pending";
    draggingRef.current = false;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragAxisRef.current === "pending") {
      const dx = Math.abs(event.clientX - pointerStartRef.current.x);
      const dy = Math.abs(event.clientY - pointerStartRef.current.y);
      const threshold = 8;

      if (dx >= threshold || dy >= threshold) {
        if (dx > dy) {
          dragAxisRef.current = "horizontal";
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromClientX(event.clientX);
        } else {
          dragAxisRef.current = "vertical";
        }
      }
    }

    if (!draggingRef.current) return;
    updateFromClientX(event.clientX);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    dragAxisRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* releasing a non-captured pointer is harmless */
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next = split;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = split - (event.shiftKey ? 10 : 4);
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = split + (event.shiftKey ? 10 : 4);
        break;
      case "PageDown":
        next = split - 12;
        break;
      case "PageUp":
        next = split + 12;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    setSplit(clamp(next, 0, 100));
    if (!hasInteracted) setHasInteracted(true);
  };

  const rounded = pdfPercent;

  return (
    <figure
      data-pillar-animation="pdf-vs-digital"
      data-slider-value={rounded}
      className={`relative isolate ${className}`}
    >
      <PhoneComparisonFrame sliderId={sliderId}>
        <div
          ref={wrapperRef}
          role="slider"
          tabIndex={0}
          aria-label="Comparer un menu PDF ouvert sur téléphone après scan QR et l'expérience Vistaire dans le même téléphone. Utilisez les flèches du clavier pour ajuster, Home et Fin pour les extrêmes."
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pdfPercent}
          aria-valuetext={`${pdfPercent} pour cent PDF, ${vistairePercent} pour cent Vistaire`}
          aria-controls={`${sliderId}-pdf ${sliderId}-vistaire`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          style={
            {
              ["--split" as string]: `${split}%`,
              touchAction: "pan-y"
            } as React.CSSProperties
          }
          className="group relative aspect-[9/16] w-full cursor-ew-resize select-none overflow-hidden bg-[#0a0706] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0605]"
        >
          <div
            id={`${sliderId}-vistaire`}
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: "inset(0 0 0 var(--split))" }}
          >
            <VistaireScene preview={preview} vistaireLabel={vistaireLabel} />
          </div>

          <div
            id={`${sliderId}-pdf`}
            aria-hidden
            className="absolute inset-0 z-10 overflow-hidden"
            style={{ clipPath: "inset(0 calc(100% - var(--split)) 0 0)" }}
          >
            <PdfScene
              restaurantName={preview.restaurant.name}
              sections={preview.pdfSections}
              pdfLabel={pdfLabel}
            />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-20"
            style={{ left: "var(--split)", transform: "translateX(-50%)" }}
          >
            <div className="relative flex h-full w-14 items-center justify-center sm:w-16">
              <span className="absolute inset-y-[8%] left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-cream/25 via-champagne/90 to-cream/25 shadow-[0_0_16px_rgba(217,184,121,0.45)]" />
              <span className="relative grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full border border-champagne/60 bg-[#0a0706]/80 text-cream shadow-[0_6px_24px_rgba(0,0,0,0.55)] transition group-focus-visible:border-cream group-focus-visible:ring-2 group-focus-visible:ring-cream/40 sm:h-12 sm:w-12">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  aria-hidden
                >
                  <path d="M9 6 4 12l5 6" />
                  <path d="m15 6 5 6-5 6" />
                </svg>
              </span>
            </div>
          </div>

          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-[8%] z-30 mx-auto w-fit max-w-[88%] rounded-full border border-cream/15 bg-[#0a0706]/75 px-2.5 py-1 text-center text-[9px] uppercase tracking-[0.18em] text-cream/80 transition-opacity duration-500 motion-reduce:transition-none sm:text-[10px]"
            style={{ opacity: hasInteracted ? 0 : 1 }}
          >
            <span className="sm:hidden">Glissez pour comparer</span>
            <span className="hidden sm:inline">Glissez ou utilisez les flèches</span>
          </span>
        </div>
      </PhoneComparisonFrame>
      <figcaption className="sr-only">
        Comparaison dans le même téléphone après scan QR : menu PDF dense et statique
        versus carte Vistaire mobile-first. Glissez horizontalement ou utilisez les
        flèches du clavier pour ajuster la séparation.
      </figcaption>
    </figure>
  );
}
