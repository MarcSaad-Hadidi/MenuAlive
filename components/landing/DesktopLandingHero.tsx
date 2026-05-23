"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DynamicVideoText } from "@/components/DynamicVideoText";
import { frameConfig } from "@/lib/frameConfig";
import { getActiveChapter, videoChapters } from "@/lib/videoChapters";

const INITIAL_FRAME_BATCH = 32;
const NEARBY_PRELOAD_RADIUS = 22;
const BACKGROUND_FRAME_BATCH = 6;
const BACKGROUND_PRELOAD_LIMIT = 280;
const MAX_CACHED_FRAMES = 100;
const MAX_DEVICE_PIXEL_RATIO = 1.5;
const FRAME_SAFE_CROP_SCALE = 1.02;
const NEAREST_FRAME_FALLBACK_RADIUS = 8;

type LoadState = "loading" | "canvas" | "fallback";

type CanvasMetrics = {
  width: number;
  height: number;
  dpr: number;
};

type ScrollDebugState = {
  progress: number;
  frameIndex: number;
  activeChapter: string;
  loadedFrames: number;
  frameCount: number;
  engine: "desktop-canvas";
};

declare global {
  interface Window {
    __VISTAIRE_SCROLL_DEBUG__?: ScrollDebugState;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
}

export function DesktopLandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasMetricsRef = useRef<CanvasMetrics>({
    width: 0,
    height: 0,
    dpr: 1
  });
  const imagesRef = useRef<Array<HTMLImageElement | null>>([]);
  const imageRequestsRef = useRef<Map<number, Promise<HTMLImageElement>>>(
    new Map()
  );
  const cachedFrameOrderRef = useRef<number[]>([]);
  const storyFrameIndexesRef = useRef<Set<number>>(new Set());
  const progressRef = useRef(0);
  const currentFrameRef = useRef(-1);
  const currentChapterRef = useRef(videoChapters[0].id);
  const lastPreloadFrameRef = useRef(-1);
  const lastPreloadDirectionRef = useRef(1);
  const backgroundCursorRef = useRef(INITIAL_FRAME_BATCH);

  const [activeChapter, setActiveChapter] = useState(videoChapters[0]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const context = canvas?.getContext("2d", { alpha: false });

    if (!canvas || !section || !context) {
      setLoadState("fallback");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    let cancelled = false;
    let trigger: ScrollTrigger | null = null;
    let resizeRaf: number | null = null;
    let backgroundTimeout: number | null = null;

    imagesRef.current = Array.from(
      { length: frameConfig.frameCount },
      () => null
    );
    imageRequestsRef.current.clear();
    cachedFrameOrderRef.current = [];
    storyFrameIndexesRef.current = new Set();
    backgroundCursorRef.current = INITIAL_FRAME_BATCH;
    lastPreloadFrameRef.current = -1;
    lastPreloadDirectionRef.current = 1;
    currentFrameRef.current = -1;

    const clampFrameIndex = (index: number) =>
      clamp(index, 0, frameConfig.frameCount - 1);

    const rememberLoadedFrame = (index: number) => {
      cachedFrameOrderRef.current = cachedFrameOrderRef.current.filter(
        (cachedIndex) => cachedIndex !== index
      );
      cachedFrameOrderRef.current.push(index);
    };

    const pruneFrameCache = (centerIndex: number) => {
      const keepStart = Math.max(0, centerIndex - NEARBY_PRELOAD_RADIUS * 2);
      const keepEnd = Math.min(
        frameConfig.frameCount - 1,
        centerIndex + NEARBY_PRELOAD_RADIUS * 2
      );

      while (cachedFrameOrderRef.current.length > MAX_CACHED_FRAMES) {
        const removableIndex = cachedFrameOrderRef.current.findIndex(
          (cachedIndex) =>
            !storyFrameIndexesRef.current.has(cachedIndex) &&
            (cachedIndex < keepStart || cachedIndex > keepEnd)
        );

        if (removableIndex < 0) return;

        const [removedFrameIndex] = cachedFrameOrderRef.current.splice(
          removableIndex,
          1
        );
        imagesRef.current[removedFrameIndex] = null;
      }
    };

    const loadFrame = (
      index: number,
      priority: "high" | "low" = "low"
    ) => {
      const safeIndex = clampFrameIndex(index);
      const existingImage = imagesRef.current[safeIndex];

      if (existingImage) {
        rememberLoadedFrame(safeIndex);
        return Promise.resolve(existingImage);
      }

      const existingRequest = imageRequestsRef.current.get(safeIndex);
      if (existingRequest) return existingRequest;

      const request = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.loading = "eager";
        image.fetchPriority = priority;

        image.onload = () => {
          if (cancelled) {
            imageRequestsRef.current.delete(safeIndex);
            reject(new Error("cancelled"));
            return;
          }

          imagesRef.current[safeIndex] = image;
          imageRequestsRef.current.delete(safeIndex);
          rememberLoadedFrame(safeIndex);
          pruneFrameCache(
            currentFrameRef.current >= 0
              ? currentFrameRef.current
              : safeIndex
          );
          resolve(image);
        };

        image.onerror = () => {
          imageRequestsRef.current.delete(safeIndex);
          reject(new Error(`Unable to load frame ${safeIndex + 1}`));
        };

        image.src = frameConfig.framePath(safeIndex);
      });

      imageRequestsRef.current.set(safeIndex, request);
      return request;
    };

    const findNearestLoadedFrame = (index: number) => {
      const safeIndex = clampFrameIndex(index);
      const images = imagesRef.current;

      if (images[safeIndex]) {
        rememberLoadedFrame(safeIndex);
        return { image: images[safeIndex], index: safeIndex };
      }

      for (let offset = 1; offset <= NEAREST_FRAME_FALLBACK_RADIUS; offset += 1) {
        const previous = safeIndex - offset;
        const next = safeIndex + offset;

        if (previous >= 0 && images[previous]) {
          rememberLoadedFrame(previous);
          return { image: images[previous], index: previous };
        }

        if (next < frameConfig.frameCount && images[next]) {
          rememberLoadedFrame(next);
          return { image: images[next], index: next };
        }
      }

      return null;
    };

    const drawImageCover = (image: HTMLImageElement) => {
      const canvasWidth =
        canvasMetricsRef.current.width || canvas.clientWidth || window.innerWidth;
      const canvasHeight =
        canvasMetricsRef.current.height ||
        canvas.clientHeight ||
        window.innerHeight;

      if (canvasWidth === 0 || canvasHeight === 0) return;

      const imageAspect = image.naturalWidth / image.naturalHeight;
      const canvasAspect = canvasWidth / canvasHeight;
      let drawWidth = canvasWidth;
      let drawHeight = canvasHeight;
      let drawX = 0;
      let drawY = 0;

      if (imageAspect > canvasAspect) {
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imageAspect;
        drawX = (canvasWidth - drawWidth) / 2;
      } else {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imageAspect;
        drawY = (canvasHeight - drawHeight) / 2;
      }

      drawWidth *= FRAME_SAFE_CROP_SCALE;
      drawHeight *= FRAME_SAFE_CROP_SCALE;
      drawX = canvasWidth * 0.5 - drawWidth * 0.5;
      drawY = canvasHeight * 0.5 - drawHeight * 0.5;

      context.fillStyle = "#080706";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.globalAlpha = 1;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    };

    const writeDebugState = (progress: number, frameIndex: number) => {
      const debug: ScrollDebugState = {
        progress,
        frameIndex,
        activeChapter: currentChapterRef.current,
        loadedFrames: cachedFrameOrderRef.current.length,
        frameCount: frameConfig.frameCount,
        engine: "desktop-canvas"
      };

      window.__VISTAIRE_SCROLL_DEBUG__ = debug;
    };

    const updateActiveChapter = (progress: number) => {
      const nextChapter = getActiveChapter(progress);

      if (nextChapter.id !== currentChapterRef.current) {
        currentChapterRef.current = nextChapter.id;
        setActiveChapter(nextChapter);
      }
    };

    const drawFrame = (progress: number, force = false) => {
      const safeProgress = clamp01(progress);
      const targetIndex = clampFrameIndex(
        Math.round(safeProgress * (frameConfig.frameCount - 1))
      );

      if (!force && targetIndex === currentFrameRef.current) {
        writeDebugState(safeProgress, targetIndex);
        return;
      }

      const nearest = findNearestLoadedFrame(targetIndex);

      if (!nearest?.image) {
        loadFrame(targetIndex, "high")
          .then(() => {
            if (cancelled) return;
            const currentTargetIndex = clampFrameIndex(
              Math.round(progressRef.current * (frameConfig.frameCount - 1))
            );
            if (currentTargetIndex === targetIndex) {
              drawFrame(progressRef.current, true);
            }
          })
          .catch(() => undefined);
        return;
      }

      drawImageCover(nearest.image);
      currentFrameRef.current = nearest.index;
      canvas.dataset.frameIndex = String(nearest.index);
      canvas.dataset.desktopCanvas = "true";
      writeDebugState(safeProgress, nearest.index);
      pruneFrameCache(nearest.index);

      if (!imagesRef.current[targetIndex]) {
        loadFrame(targetIndex, "high")
          .then(() => {
            if (cancelled) return;
            const currentTargetIndex = clampFrameIndex(
              Math.round(progressRef.current * (frameConfig.frameCount - 1))
            );
            if (currentTargetIndex === targetIndex) {
              drawFrame(progressRef.current, true);
            }
          })
          .catch(() => undefined);
      }
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.max(1, Math.floor(rect.width || window.innerWidth));
      const displayHeight = Math.max(
        1,
        Math.floor(rect.height || window.innerHeight)
      );
      const dpr = Math.min(
        Math.max(1, window.devicePixelRatio || 1),
        MAX_DEVICE_PIXEL_RATIO
      );
      const width = Math.floor(displayWidth * dpr);
      const height = Math.floor(displayHeight * dpr);

      canvasMetricsRef.current = {
        width: displayWidth,
        height: displayHeight,
        dpr
      };
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(progressRef.current, true);
    };

    const scheduleResize = () => {
      if (resizeRaf !== null) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = null;
        resizeCanvas();
        ScrollTrigger.refresh();
      });
    };

    const preloadNearbyFrames = (index: number, direction = 1) => {
      const safeIndex = clampFrameIndex(index);
      const preferredDirection = direction >= 0 ? 1 : -1;

      if (
        Math.abs(safeIndex - lastPreloadFrameRef.current) < 1 &&
        preferredDirection === lastPreloadDirectionRef.current
      ) {
        return;
      }

      lastPreloadFrameRef.current = safeIndex;
      lastPreloadDirectionRef.current = preferredDirection;

      for (let offset = 1; offset <= NEARBY_PRELOAD_RADIUS; offset += 1) {
        const next = safeIndex + offset * preferredDirection;
        const previous = safeIndex - offset * preferredDirection;

        if (next >= 0 && next < frameConfig.frameCount) {
          loadFrame(next, offset <= 4 ? "high" : "low").catch(() => undefined);
        }

        if (previous >= 0 && previous < frameConfig.frameCount) {
          loadFrame(previous, offset <= 3 ? "high" : "low").catch(
            () => undefined
          );
        }
      }
    };

    const preloadStoryFrames = () => {
      const storyFrameIndexes = new Set<number>();

      videoChapters.forEach((chapter) => {
        const anchorIndex = clampFrameIndex(
          Math.round(chapter.start * (frameConfig.frameCount - 1))
        );

        for (let offset = -2; offset <= 3; offset += 1) {
          storyFrameIndexes.add(clampFrameIndex(anchorIndex + offset));
        }
      });

      storyFrameIndexes.add(frameConfig.frameCount - 1);
      storyFrameIndexesRef.current = storyFrameIndexes;
      storyFrameIndexes.forEach((index) => {
        loadFrame(index, "high").catch(() => undefined);
      });
    };

    const scheduleBackgroundPreload = () => {
      if (backgroundTimeout !== null || cancelled) return;

      backgroundTimeout = window.setTimeout(() => {
        backgroundTimeout = null;
        if (cancelled) return;

        const start = backgroundCursorRef.current;
        const end = Math.min(
          frameConfig.frameCount,
          BACKGROUND_PRELOAD_LIMIT,
          start + BACKGROUND_FRAME_BATCH
        );

        for (let index = start; index < end; index += 1) {
          loadFrame(index, "low").catch(() => undefined);
        }

        backgroundCursorRef.current = end;

        if (end < Math.min(frameConfig.frameCount, BACKGROUND_PRELOAD_LIMIT)) {
          scheduleBackgroundPreload();
        }
      }, 220);
    };

    const updateProgress = (progress: number) => {
      const safeProgress = clamp01(progress);
      const previousProgress = progressRef.current;
      const frameIndex = clampFrameIndex(
        Math.round(safeProgress * (frameConfig.frameCount - 1))
      );
      const direction = safeProgress >= previousProgress ? 1 : -1;

      progressRef.current = safeProgress;
      updateActiveChapter(safeProgress);
      drawFrame(safeProgress);
      preloadNearbyFrames(frameIndex, direction);
    };

    resizeCanvas();

    loadFrame(0, "high")
      .then(() => {
        if (cancelled) return;
        drawFrame(0, true);
        setLoadState("canvas");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState("fallback");
        }
      });

    for (
      let index = 1;
      index < Math.min(INITIAL_FRAME_BATCH, frameConfig.frameCount);
      index += 1
    ) {
      loadFrame(index, index < 5 ? "high" : "low").catch(() => undefined);
    }

    preloadStoryFrames();
    scheduleBackgroundPreload();

    trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => updateProgress(self.progress),
      onRefresh: (self) => updateProgress(self.progress)
    });

    updateProgress(trigger.progress);

    window.addEventListener("resize", scheduleResize, { passive: true });
    window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (!cancelled) {
        updateProgress(trigger?.progress ?? progressRef.current);
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", scheduleResize);

      if (resizeRaf !== null) {
        window.cancelAnimationFrame(resizeRaf);
      }

      if (backgroundTimeout !== null) {
        window.clearTimeout(backgroundTimeout);
      }

      trigger?.kill();
      delete window.__VISTAIRE_SCROLL_DEBUG__;
    };
  }, []);

  if (loadState === "fallback") {
    return (
      <section
        id="experience"
        data-landing-hero-mode="desktop"
        data-hero-engine="desktop-canvas-fallback"
        className="relative h-[100vh] min-h-[560px] overflow-clip bg-[#080706]"
        aria-label="Expérience Vistaire"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frameConfig.framePath(0)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="video-readable-overlay absolute inset-0 z-10" />
        <div className="video-warmth absolute inset-0 z-10" />
        <div className="video-grain absolute inset-0 z-10" />
        <div className="absolute inset-0 z-30 flex items-center px-5 pt-28 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-7xl">
            <DynamicVideoText chapter={activeChapter} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="experience"
      data-landing-hero-mode="desktop"
      data-hero-engine="desktop-canvas"
      className="scroll-video-section relative overflow-clip bg-[#080706]"
      aria-label="Expérience Vistaire"
    >
      <div className="video-sticky-viewport sticky top-0 w-full overflow-hidden bg-[#080706] [contain:paint]">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-desktop-canvas="true"
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
            loadState === "canvas" ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="video-readable-overlay absolute inset-0 z-10" />
        <div className="video-warmth absolute inset-0 z-10" />
        <div className="video-transition-veil absolute inset-0 z-10" />
        <div className="video-grain absolute inset-0 z-10" />
        <div className="relative z-20 flex h-full w-full items-center px-5 pt-28 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-7xl">
            <DynamicVideoText chapter={activeChapter} />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-[#080706] via-[#080706]/72 to-transparent" />
      </div>
    </section>
  );
}
