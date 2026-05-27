"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import type {
  CompareDishPreview,
  PdfComparePreviewData,
  PdfMenuSection
} from "@/lib/pdfComparePreviewData";
import styles from "./VistairePreviewPdfCompareSlider.module.css";

type VistairePreviewPdfCompareSliderProps = {
  preview: PdfComparePreviewData;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function PdfRow({ name, price }: { name: string; price: string }) {
  return (
    <div className={styles.pdfRow}>
      <span className={styles.pdfDishName}>{name}</span>
      <span className={styles.pdfDots} aria-hidden="true" />
      <span className={styles.pdfPrice}>{price}</span>
    </div>
  );
}

export function VistairePreviewPdfLayer({
  restaurantName,
  sections
}: {
  restaurantName: string;
  sections: PdfMenuSection[];
}) {
  return (
    <div className={styles.pdfScene} aria-hidden="true">
      <span className={`${styles.layerLabel} ${styles.pdfLabel}`}>PDF</span>
      <div className={styles.pdfContent}>
        <p className={styles.pdfRestaurant}>{restaurantName}</p>
        <h3 className={styles.pdfTitle}>Carte</h3>
        <span className={styles.pdfDivider} />
        <div className={styles.pdfSections}>
          {sections.map((section) => (
            <section key={section.title}>
              <p className={styles.pdfSectionTitle}>{section.title}</p>
              {section.rows.map((row) => (
                <PdfRow key={`${section.title}-${row.name}`} {...row} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function DishRow({ dish, priority }: { dish: CompareDishPreview; priority: boolean }) {
  return (
    <article className={styles.dishRow}>
      <span className={styles.dishImage}>
        {dish.image ? (
          <Image
            alt={dish.imageAlt}
            fill
            priority={priority}
            quality={90}
            sizes="72px"
            src={dish.image}
            style={{ objectPosition: dish.imageObjectPosition }}
            unoptimized
          />
        ) : null}
      </span>
      <span className={styles.dishCopy}>
        <span className={styles.dishName}>{dish.name}</span>
        <span className={styles.dishDescription}>{dish.shortDescription}</span>
        <span className={styles.dishBadges} aria-hidden="true">
          {dish.isSignature ? <span>Signature</span> : null}
          {dish.isRecommended ? <span>Recommandé</span> : null}
          {dish.has3d ? <span>3D</span> : null}
        </span>
      </span>
      <span className={styles.dishPrice}>{dish.price}</span>
    </article>
  );
}

export function VistairePreviewMenuLayer({
  preview
}: {
  preview: PdfComparePreviewData;
}) {
  const activeTabs = preview.categoryTabs;

  return (
    <div className={styles.previewMenu}>
      <header className={styles.previewHeader}>
        <div className={styles.previewBrandRow}>
          <p className={styles.previewEyebrow}>Carte client</p>
          <span>Vistaire</span>
        </div>
        <h3>{preview.restaurant.name}</h3>
        <p className={styles.previewTagline}>{preview.restaurant.tagline}</p>
        <p className={styles.phoneBadge}>Aperçu téléphone</p>
      </header>

      <nav className={styles.tabs} aria-hidden="true">
        {activeTabs.map((tab) => (
          <span
            className={
              tab.slug === preview.activeCategorySlug
                ? `${styles.tab} ${styles.tabActive}`
                : styles.tab
            }
            key={tab.id}
          >
            {tab.slug === "plats-signatures" ? "Signatures" : tab.name}
          </span>
        ))}
      </nav>

      <div className={styles.menuTools}>
        <span className={styles.searchMock}>Rechercher un plat...</span>
        <span className={styles.filterRow}>
          <span className={styles.filterPill}>Signature</span>
          <span className={styles.filterPill}>Recommandé</span>
          <span className={styles.filterPill}>Vue 3D</span>
        </span>
        <p className={styles.statusText}>
          Démo interactive Vistaire · Maison Élyse
        </p>
      </div>

      <div className={styles.dishList}>
        {preview.vistaireDishes.map((dish, index) => (
          <DishRow dish={dish} key={dish.slug} priority={index === 0} />
        ))}
      </div>
    </div>
  );
}

export function VistairePreviewPdfCompareSlider({
  preview,
  className = ""
}: VistairePreviewPdfCompareSliderProps) {
  const sliderId = useId();
  const sliderRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const nextSplitRef = useRef(50);
  const draggingRef = useRef(false);
  const [split, setSplit] = useState(50);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const commitSplit = (value: number) => {
    const next = clamp(value, 0, 100);
    nextSplitRef.current = next;

    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const committed = nextSplitRef.current;
      sliderRef.current?.style.setProperty("--split", `${committed}%`);
      setSplit(Math.round(committed));
    });
  };

  const updateFromClientX = (clientX: number) => {
    const wrapper = sliderRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0) return;
    commitSplit(((clientX - rect.left) / rect.width) * 100);
    if (!hasInteracted) setHasInteracted(true);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== undefined && event.button !== 0) return;
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released by the browser.
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 4;
    let next = split;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = split - step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = split + step;
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
    commitSplit(next);
    if (!hasInteracted) setHasInteracted(true);
  };

  return (
    <figure
      className={`${styles.figure} ${className}`}
      data-preview-comparison="pdf-vs-digital"
    >
      <div className={styles.phoneFrame}>
        <span className={styles.notch} aria-hidden="true" />
        <div className={styles.screen}>
          <div
            ref={sliderRef}
            role="slider"
            tabIndex={0}
            aria-label="Comparer un menu PDF et le nouveau menu preview Vistaire."
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={split}
            aria-valuetext={`${split} pour cent PDF, ${100 - split} pour cent Vistaire`}
            aria-controls={`${sliderId}-pdf ${sliderId}-vistaire`}
            className={styles.slider}
            onKeyDown={onKeyDown}
            onPointerCancel={onPointerUp}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className={styles.vistaireLayer} id={`${sliderId}-vistaire`}>
              <VistairePreviewMenuLayer preview={preview} />
            </div>
            <div
              aria-hidden="true"
              className={styles.pdfLayer}
              id={`${sliderId}-pdf`}
            >
              <VistairePreviewPdfLayer
                restaurantName={preview.restaurant.name}
                sections={preview.pdfSections}
              />
            </div>

            <span className={styles.handle} aria-hidden="true">
              <span className={styles.handleLine} />
              <span className={styles.handleButton}>
                <svg
                  aria-hidden="true"
                  fill="none"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                >
                  <path
                    d="M9 6 4 12l5 6m6-12 5 6-5 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
            </span>

            {!hasInteracted ? (
              <span className={styles.hint}>Glissez pour comparer</span>
            ) : null}
          </div>
        </div>
        <span className={styles.homeBar} aria-hidden="true">
          <span />
        </span>
      </div>
      <figcaption className={styles.srOnly}>
        Comparaison dans le même téléphone : menu PDF dense et carte digitale
        Vistaire preview avec catégories, recherche, filtres et fiches plats.
      </figcaption>
    </figure>
  );
}
