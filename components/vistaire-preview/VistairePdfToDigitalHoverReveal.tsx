"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { PdfComparePreviewData } from "@/lib/pdfComparePreviewData";
import {
  VistairePreviewMenuLayer,
  VistairePreviewPdfLayer
} from "./VistairePreviewPdfCompareSlider";
import sliderStyles from "./VistairePreviewPdfCompareSlider.module.css";
import styles from "./VistairePdfToDigitalHoverReveal.module.css";

type VistairePdfToDigitalHoverRevealProps = {
  preview: PdfComparePreviewData;
};

export function VistairePdfToDigitalHoverReveal({
  preview
}: VistairePdfToDigitalHoverRevealProps) {
  const captionId = useId();
  const frameId = useId();
  const [revealed, setRevealed] = useState(false);
  const [fingerActive, setFingerActive] = useState(false);

  const updateRevealPosition = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty("--reveal-x", `${x}%`);
    event.currentTarget.style.setProperty("--reveal-y", `${y}%`);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    updateRevealPosition(event);

    if (event.pointerType !== "touch") return;
    setFingerActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    updateRevealPosition(event);

    if (event.pointerType === "touch") {
      setFingerActive(true);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setRevealed((current) => !current);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      setFingerActive(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // The browser may already have released the pointer.
      }
      return;
    }

    if (event.pointerType !== "mouse") return;
    setRevealed((current) => !current);
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    setFingerActive(false);
  };

  return (
    <figure
      className={styles.figure}
      data-preview-interaction="pdf-to-vistaire-hover-reveal"
    >
      <div className={sliderStyles.phoneFrame}>
        <span className={sliderStyles.notch} aria-hidden="true" />
        <div className={sliderStyles.screen}>
          <div
            aria-describedby={captionId}
            aria-label="Révéler le menu digital Vistaire par-dessus le menu PDF"
            aria-pressed={revealed || fingerActive}
            className={styles.frame}
            data-preview-reveal-frame="true"
            data-revealed={revealed ? "true" : "false"}
            data-touching={fingerActive ? "true" : "false"}
            id={frameId}
            onKeyDown={onKeyDown}
            onPointerCancel={onPointerCancel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            role="button"
            tabIndex={0}
          >
            <div className={styles.vistaireLayer} data-preview-digital-layer="true">
              <VistairePreviewMenuLayer preview={preview} />
            </div>
            <div className={styles.pdfLayer} aria-hidden="true">
              <VistairePreviewPdfLayer
                restaurantName={preview.restaurant.name}
                sections={preview.pdfSections}
              />
            </div>

            <span className={styles.cursorRing} aria-hidden="true" />
            <span className={styles.hint} aria-hidden="true">
              Survolez pour révéler Vistaire
            </span>
          </div>
        </div>
        <span className={sliderStyles.homeBar} aria-hidden="true">
          <span />
        </span>
      </div>

      <figcaption id={captionId} className="sr-only">
        Comparaison interactive : le menu PDF apparaît d&apos;abord dans le même
        téléphone que le slider de comparaison. Au survol, au déplacement du
        doigt ou au focus clavier, la carte digitale Vistaire se révèle par
        masque.
      </figcaption>
    </figure>
  );
}
