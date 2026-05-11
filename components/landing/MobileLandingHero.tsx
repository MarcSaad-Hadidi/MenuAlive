"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DynamicVideoText } from "@/components/DynamicVideoText";
import { frameConfig } from "@/lib/frameConfig";
import { getActiveChapter, videoChapters } from "@/lib/videoChapters";

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function MobileLandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const chapterIdRef = useRef(videoChapters[0].id);

  const [chapter, setChapter] = useState(videoChapters[0]);

  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const currentDrawnIndexRef = useRef(-1);
  const loadFrameRef = useRef<
    | ((
        index: number,
        priority?: "high" | "low" | "auto"
      ) => HTMLImageElement | null)
    | null
  >(null);

  useEffect(() => {
    imagesRef.current = Array.from(
      { length: frameConfig.frameCount },
      () => null
    );
  }, []);

  const drawFrame = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clientWidth = canvas.clientWidth || window.innerWidth;
    const clientHeight = canvas.clientHeight || window.innerHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const renderDpr = Math.min(dpr, 1.5);

    const targetW = Math.round(clientWidth * renderDpr);
    const targetH = Math.round(clientHeight * renderDpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;

    const exactFrame = progress * (frameConfig.frameCount - 1);
    const targetIndex = Math.round(exactFrame);

    let imgToDraw = imagesRef.current[targetIndex];
    let actualIndex = targetIndex;

    if (!imgToDraw) {
      for (let offset = 1; offset < 15; offset += 1) {
        if (targetIndex - offset >= 0 && imagesRef.current[targetIndex - offset]) {
          imgToDraw = imagesRef.current[targetIndex - offset];
          actualIndex = targetIndex - offset;
          break;
        }
        if (
          targetIndex + offset < frameConfig.frameCount &&
          imagesRef.current[targetIndex + offset]
        ) {
          imgToDraw = imagesRef.current[targetIndex + offset];
          actualIndex = targetIndex + offset;
          break;
        }
      }

      if (loadFrameRef.current) {
        loadFrameRef.current(targetIndex, "high");
      }

      if (!imgToDraw) return;
    }

    const imgW = imgToDraw.naturalWidth || imgToDraw.width;
    const imgH = imgToDraw.naturalHeight || imgToDraw.height;
    if (imgW === 0 || imgH === 0) return;

    currentDrawnIndexRef.current = actualIndex;
    canvas.dataset.frameIndex = String(actualIndex);

    const cvsW = canvas.width;
    const cvsH = canvas.height;
    const visibleWidthRatio = 0.58;
    const fgDrawW = cvsW / visibleWidthRatio;
    const fgDrawH = fgDrawW / (imgW / imgH);
    const focalX = 0.46 + progress * 0.04;
    const fgDx = cvsW / 2 - fgDrawW * focalX;
    const fgDy = 0;

    ctx.fillStyle = "#080706";
    ctx.fillRect(0, 0, cvsW, cvsH);
    ctx.drawImage(imgToDraw, fgDx, fgDy, fgDrawW, fgDrawH);

    const fadeHeight = cvsH * 0.25;
    const fadeStart = Math.max(0, fgDy + fgDrawH - fadeHeight);
    const fade = ctx.createLinearGradient(0, fadeStart, 0, fgDy + fgDrawH);
    fade.addColorStop(0, "rgba(8, 7, 6, 0)");
    fade.addColorStop(0.8, "rgba(8, 7, 6, 0.95)");
    fade.addColorStop(1, "#080706");
    ctx.fillStyle = fade;
    ctx.fillRect(0, fadeStart, cvsW, cvsH - fadeStart);
  }, []);

  const loadFrame = useCallback(
    (
      index: number,
      priority: "high" | "low" | "auto" = "auto"
    ): HTMLImageElement | null => {
      if (index < 0 || index >= frameConfig.frameCount) return null;
      if (imagesRef.current[index]) return imagesRef.current[index];

      const img = new Image();
      img.fetchPriority = priority;
      img.src = frameConfig.framePath(index);
      img.onload = () => {
        imagesRef.current[index] = img;
        const expectedFrame = Math.round(
          progressRef.current * (frameConfig.frameCount - 1)
        );
        if (expectedFrame === index || currentDrawnIndexRef.current === -1) {
          drawFrame(progressRef.current);
        }
      };
      return null;
    },
    [drawFrame]
  );

  useEffect(() => {
    loadFrameRef.current = loadFrame;
  }, [loadFrame]);

  useEffect(() => {
    const step = 3;

    loadFrame(0, "high");
    videoChapters.forEach((chapterItem) => {
      loadFrame(
        Math.round(chapterItem.start * (frameConfig.frameCount - 1)),
        "high"
      );
    });

    let currentIndex = 0;
    let timeoutId: number | null = null;

    const backgroundLoad = () => {
      let batchCount = 0;
      while (currentIndex < frameConfig.frameCount && batchCount < 5) {
        if (currentIndex % step === 0 && !imagesRef.current[currentIndex]) {
          loadFrame(currentIndex, "low");
          batchCount += 1;
        }
        currentIndex += 1;
      }
      if (currentIndex < frameConfig.frameCount) {
        timeoutId = window.setTimeout(backgroundLoad, 40);
      }
    };

    timeoutId = window.setTimeout(backgroundLoad, 500);
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [loadFrame]);

  useEffect(() => {
    const updateFromScroll = () => {
      rafRef.current = null;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const scrollableDistance = Math.max(1, rect.height - viewportHeight);
      const progress = clamp01(-rect.top / scrollableDistance);
      progressRef.current = progress;

      const nextChapter = getActiveChapter(progress);
      if (nextChapter.id !== chapterIdRef.current) {
        chapterIdRef.current = nextChapter.id;
        setChapter(nextChapter);
      }

      drawFrame(progress);
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(updateFromScroll);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [drawFrame]);

  return (
    <section
      ref={sectionRef}
      id="experience"
      data-landing-hero-mode="mobile"
      data-hero-engine="mobile-current"
      className="scroll-video-section relative overflow-clip bg-[#080706]"
    >
      <div className="video-sticky-viewport sticky top-0 overflow-hidden bg-[#080706]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full opacity-100"
          aria-hidden="true"
          data-mobile-canvas="true"
          style={{ objectFit: "cover" }}
        />
        <div className="video-readable-overlay absolute inset-0 z-10" />
        <div className="video-warmth absolute inset-0 z-10" />
        <div className="video-grain absolute inset-0 z-10" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 z-20 h-28 w-44 bg-gradient-to-br from-[#080706]/0 via-[#080706]/88 to-[#080706] md:h-24 md:w-44"
        />
        <div className="absolute inset-0 z-30 flex items-end px-5 pb-14 pt-28 sm:px-10 sm:pb-20 md:items-center md:pb-0 lg:px-16">
          <div className="mx-auto w-full max-w-7xl">
            <DynamicVideoText chapter={chapter} />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-[#080706] via-[#080706]/72 to-transparent" />
      </div>
    </section>
  );
}
