"use client";

import { useEffect, useRef, useState } from "react";
import { DynamicVideoText } from "@/components/DynamicVideoText";
import { frameConfig } from "@/lib/frameConfig";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { getActiveChapter, videoChapters } from "@/lib/videoChapters";

const PRIMARY_VIDEO_SRC = "/videos/upscaled-video.mp4";
const LEGACY_VIDEO_FALLBACK_SRC = "/videos/menualive-full.mp4";
const INITIAL_FRAME_BATCH = 18;
const NEARBY_PRELOAD_RADIUS = 10;
const MAX_CACHED_FRAMES = 56;
const PROGRESS_EASE = 0.12;
const MAX_DEVICE_PIXEL_RATIO = 2;
const DEBUG_SCROLL_VIDEO: boolean = false;

type LoadState = "loading" | "canvas" | "fallback";

export function CanvasScrollVideo() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasMetricsRef = useRef({ width: 0, height: 0, dpr: 1 });
  const debugRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Array<HTMLImageElement | null>>(
    Array.from({ length: frameConfig.frameCount }, () => null)
  );
  const imageRequestsRef = useRef<Map<number, Promise<HTMLImageElement>>>(
    new Map()
  );
  const cachedFrameOrderRef = useRef<number[]>([]);
  const targetProgressRef = useRef(0);
  const displayedProgressRef = useRef(0);
  const currentChapterRef = useRef(videoChapters[0].id);
  const currentFrameRef = useRef(-1);
  const lastDebugTextRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const [activeChapter, setActiveChapter] = useState(videoChapters[0]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const context = canvas?.getContext("2d", {
      alpha: false,
      desynchronized: true
    });

    if (!canvas || !section || !context) {
      const frame = window.requestAnimationFrame(() => {
        setLoadState("fallback");
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    let cancelled = false;
    let removeResizeListener = () => {};
    let killScrollTrigger = () => {};

    imagesRef.current = Array.from({ length: frameConfig.frameCount }, () => null);
    imageRequestsRef.current.clear();
    cachedFrameOrderRef.current = [];

    const configureContext = () => {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    };

    const clampFrameIndex = (index: number) =>
      Math.min(frameConfig.frameCount - 1, Math.max(0, index));

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
      const cacheOrder = cachedFrameOrderRef.current;

      while (cacheOrder.length > MAX_CACHED_FRAMES) {
        const distantIndex = cacheOrder.findIndex(
          (cachedIndex) => cachedIndex < keepStart || cachedIndex > keepEnd
        );
        const removableIndex =
          distantIndex >= 0
            ? distantIndex
            : cacheOrder.findIndex((cachedIndex) => cachedIndex !== centerIndex);

        if (removableIndex < 0) {
          return;
        }

        const [removedFrameIndex] = cacheOrder.splice(removableIndex, 1);
        imagesRef.current[removedFrameIndex] = null;
      }
    };

    const updateDebugPanel = (
      progress = targetProgressRef.current,
      frameIndex = currentFrameRef.current
    ) => {
      if (!DEBUG_SCROLL_VIDEO || !debugRef.current) {
        return;
      }

      const safeFrameIndex = Math.max(0, frameIndex);
      const debugText = `progress ${progress.toFixed(3)} | chapter ${
        currentChapterRef.current
      } | frame ${safeFrameIndex + 1}/${frameConfig.frameCount}`;

      if (debugText !== lastDebugTextRef.current) {
        debugRef.current.textContent = debugText;
        lastDebugTextRef.current = debugText;
      }
    };

    const updateActiveChapter = (progress: number) => {
      const nextChapter = getActiveChapter(progress);

      if (nextChapter.id !== currentChapterRef.current) {
        currentChapterRef.current = nextChapter.id;
        setActiveChapter(nextChapter);
      }

      updateDebugPanel(progress);
    };

    const loadFrame = (index: number) => {
      const safeIndex = clampFrameIndex(index);
      const existingImage = imagesRef.current[safeIndex];

      if (existingImage) {
        rememberLoadedFrame(safeIndex);
        return Promise.resolve(existingImage);
      }

      const existingRequest = imageRequestsRef.current.get(safeIndex);

      if (existingRequest) {
        return existingRequest;
      }

      const request = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();

        image.decoding = "async";
        image.onload = async () => {
          try {
            await image.decode();
          } catch {
            // Some browsers report decode issues after a successful load.
          }

          imagesRef.current[safeIndex] = image;
          imageRequestsRef.current.delete(safeIndex);
          rememberLoadedFrame(safeIndex);
          pruneFrameCache(
            currentFrameRef.current >= 0 ? currentFrameRef.current : safeIndex
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
      const images = imagesRef.current;
      const safeIndex = clampFrameIndex(index);

      if (images[safeIndex]) {
        rememberLoadedFrame(safeIndex);
        return images[safeIndex];
      }

      for (let offset = 1; offset < frameConfig.frameCount; offset += 1) {
        const previous = safeIndex - offset;
        const next = safeIndex + offset;

        if (previous >= 0 && images[previous]) {
          rememberLoadedFrame(previous);
          return images[previous];
        }

        if (next < frameConfig.frameCount && images[next]) {
          rememberLoadedFrame(next);
          return images[next];
        }
      }

      return null;
    };

    const preloadNearbyFrames = (index: number) => {
      const safeIndex = clampFrameIndex(index);

      for (let offset = 1; offset <= NEARBY_PRELOAD_RADIUS; offset += 1) {
        const next = safeIndex + offset;
        const previous = safeIndex - offset;

        if (next < frameConfig.frameCount) {
          loadFrame(next).catch(() => undefined);
        }

        if (previous >= 0) {
          loadFrame(previous).catch(() => undefined);
        }
      }
    };

    const drawFrame = (index: number, force = false) => {
      const safeIndex = clampFrameIndex(index);

      if (!force && safeIndex === currentFrameRef.current) {
        return;
      }

      const image = findNearestLoadedFrame(safeIndex);

      if (!image) {
        return;
      }

      const canvasWidth =
        canvasMetricsRef.current.width || canvas.clientWidth || window.innerWidth;
      const canvasHeight =
        canvasMetricsRef.current.height ||
        canvas.clientHeight ||
        window.innerHeight;

      if (canvasWidth === 0 || canvasHeight === 0) {
        return;
      }

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

      configureContext();
      context.fillStyle = "#080706";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      currentFrameRef.current = safeIndex;
      pruneFrameCache(safeIndex);
      preloadNearbyFrames(safeIndex);

      if (!imagesRef.current[safeIndex]) {
        loadFrame(safeIndex)
          .then(() => {
            if (!cancelled && safeIndex === currentFrameRef.current) {
              drawFrame(safeIndex, true);
            }
          })
          .catch(() => undefined);
      }
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO
      );
      const displayWidth = Math.max(1, Math.floor(rect.width || window.innerWidth));
      const displayHeight = Math.max(
        1,
        Math.floor(rect.height || window.innerHeight)
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
      configureContext();
      drawFrame(currentFrameRef.current < 0 ? 0 : currentFrameRef.current, true);
    };

    const renderLoop = () => {
      if (cancelled) {
        return;
      }

      const targetProgress = targetProgressRef.current;
      const currentProgress = displayedProgressRef.current;
      const nextProgress =
        Math.abs(targetProgress - currentProgress) < 0.0008
          ? targetProgress
          : currentProgress + (targetProgress - currentProgress) * PROGRESS_EASE;

      displayedProgressRef.current = nextProgress;

      const clampedProgress = Math.min(1, Math.max(0, nextProgress));
      const frameIndex = Math.min(
        frameConfig.frameCount - 1,
        Math.max(0, Math.round(clampedProgress * (frameConfig.frameCount - 1)))
      );

      drawFrame(frameIndex);
      updateDebugPanel(targetProgress, frameIndex);
      rafRef.current = window.requestAnimationFrame(renderLoop);
    };

    const preloadFrames = async () => {
      try {
        await loadFrame(0);

        if (cancelled) {
          return;
        }

        resizeCanvas();
        drawFrame(0, true);
        setLoadState("canvas");

        await Promise.all(
          Array.from(
            {
              length: Math.min(
                INITIAL_FRAME_BATCH - 1,
                frameConfig.frameCount - 1
              )
            },
            (_, offset) => loadFrame(offset + 1)
          )
        );
        preloadNearbyFrames(0);
      } catch {
        if (!cancelled && mountedRef.current) {
          setLoadState("fallback");
        }
      }
    };

    const initialiseScroll = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/dist/ScrollTrigger")
      ]);

      if (cancelled) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;

          targetProgressRef.current = progress;
          updateActiveChapter(progress);
        }
      });

      targetProgressRef.current = trigger.progress;
      displayedProgressRef.current = trigger.progress;
      updateActiveChapter(trigger.progress);

      killScrollTrigger = () => {
        trigger.kill();
      };

      ScrollTrigger.refresh();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    removeResizeListener = () => {
      window.removeEventListener("resize", resizeCanvas);
    };

    rafRef.current = window.requestAnimationFrame(renderLoop);
    preloadFrames();
    initialiseScroll();

    return () => {
      cancelled = true;

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }

      removeResizeListener();
      killScrollTrigger();
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || loadState === "fallback") {
    return (
      <section
        id="experience"
        aria-label="Expérience MenuAlive"
        className="relative min-h-[100svh] overflow-hidden bg-charcoal"
      >
        <video
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        >
          <source src={PRIMARY_VIDEO_SRC} type="video/mp4" />
          <source src={LEGACY_VIDEO_FALLBACK_SRC} type="video/mp4" />
        </video>
        <div className="video-readable-overlay absolute inset-0" />
        <div className="relative z-10 flex min-h-[100svh] items-end px-5 pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-28 sm:px-10 lg:px-16 lg:pb-24">
          <DynamicVideoText chapter={activeChapter} />
        </div>
        <div className="sr-only">
          {videoChapters.map((chapter) => (
            <p key={chapter.id}>
              {chapter.eyebrow}. {chapter.title} {chapter.body}
            </p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="experience"
      aria-label="Expérience MenuAlive"
      className="relative min-h-[330vh] bg-charcoal md:min-h-[380vh]"
    >
      <div className="sticky top-0 h-[100svh] min-h-[560px] overflow-hidden bg-charcoal [contain:paint]">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
            loadState === "canvas" ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="video-readable-overlay absolute inset-0 z-10" />
        <div className="video-warmth absolute inset-0 z-10" />
        <div className="video-grain absolute inset-0 z-10" />

        <div className="relative z-20 flex h-full w-full items-end px-5 pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-28 sm:px-10 lg:px-16 lg:pb-24">
          <DynamicVideoText chapter={activeChapter} />
        </div>
        {DEBUG_SCROLL_VIDEO ? (
          <div
            ref={debugRef}
            className="pointer-events-none fixed bottom-3 right-3 z-30 rounded bg-black/55 px-3 py-2 font-mono text-[11px] leading-none text-cream/80 backdrop-blur"
          >
            progress 0.000 | chapter hero | frame 1/{frameConfig.frameCount}
          </div>
        ) : null}
      </div>
    </section>
  );
}
