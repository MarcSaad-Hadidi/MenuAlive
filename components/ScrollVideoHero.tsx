"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DynamicVideoText } from "@/components/DynamicVideoText";
import { frameConfig } from "@/lib/frameConfig";
import { getActiveChapter, videoChapters } from "@/lib/videoChapters";

// Constantes pour l'optimisation et le cadrage
const WATERMARK_CROP_SCALE = 1.06; // Rognage mathématique pour cacher "Veo"
const MOBILE_BREAKPOINT = 768;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function ScrollVideoHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const chapterIdRef = useRef(videoChapters[0].id);

  const [chapter, setChapter] = useState(videoChapters[0]);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  // Cache d'images
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const currentDrawnFrameRef = useRef(-1);
  // Ref pour briser la dépendance cyclique loadFrame <-> drawFrame
  const loadFrameRef = useRef<((index: number, priority?: "high" | "low" | "auto") => HTMLImageElement | null) | null>(null);

  // Initialisation
  useEffect(() => {
    imagesRef.current = Array.from({ length: frameConfig.frameCount }, () => null);
    
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  // Dessin sur Canvas avec "Pan & Scan" Premium et rognage Watermark
  const drawFrame = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    // Redimensionnement du canvas (fixe la pixellisation)
    const { clientWidth, clientHeight } = canvas;
    const dpr = window.devicePixelRatio || 1;
    // On limite le DPR à 1.5 pour les perfs (particulièrement sur mobile)
    const renderDpr = Math.min(dpr, 1.5); 
    
    if (canvas.width !== clientWidth * renderDpr || canvas.height !== clientHeight * renderDpr) {
      canvas.width = clientWidth * renderDpr;
      canvas.height = clientHeight * renderDpr;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    const exactFrame = progress * (frameConfig.frameCount - 1);
    const targetIndex = Math.round(exactFrame);
    
    // Fallback: si l'image ciblée n'est pas chargée, chercher la plus proche
    let imgToDraw = imagesRef.current[targetIndex];
    if (!imgToDraw) {
      for (let offset = 1; offset < 6; offset++) {
        if (targetIndex - offset >= 0 && imagesRef.current[targetIndex - offset]) {
          imgToDraw = imagesRef.current[targetIndex - offset];
          break;
        }
        if (targetIndex + offset < frameConfig.frameCount && imagesRef.current[targetIndex + offset]) {
          imgToDraw = imagesRef.current[targetIndex + offset];
          break;
        }
      }
      
      // Force le chargement immédiat si on ne l'a pas
      if (loadFrameRef.current) {
        loadFrameRef.current(targetIndex, "high");
      }
      
      if (!imgToDraw) return;
    }

    currentDrawnFrameRef.current = imagesRef.current.indexOf(imgToDraw);

    // --- MATHÉMATIQUES DE CADRAGE PREMIUM (OBJECT-COVER + WATERMARK CROP) ---
    const imgW = imgToDraw.naturalWidth;
    const imgH = imgToDraw.naturalHeight;
    const cvsW = canvas.width;
    const cvsH = canvas.height;

    const scaleX = cvsW / imgW;
    const scaleY = cvsH / imgH;
    
    // Rognage dynamique: on prend le plus grand ratio (cover) et on multiplie par WATERMARK_CROP_SCALE
    let baseScale = Math.max(scaleX, scaleY) * WATERMARK_CROP_SCALE;
    
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    
    if (isMobile) {
      // --- MOBILE SINGLE DRAW (Aligné en haut) ---
      // On évite la duplication (pas de fond flou) car on voit un téléphone dans la vidéo.
      
      const VISIBLE_WIDTH_RATIO = 0.58; // 58% de la largeur source visible
      const fgDrawW = cvsW / VISIBLE_WIDTH_RATIO;
      const fgDrawH = fgDrawW / (imgW / imgH);
      
      // Pan & Scan doux
      const focalX = 0.46 + (progress * 0.04); 
      
      const fgDx = (cvsW / 2) - (fgDrawW * focalX);
      // On l'aligne tout en haut (0) pour ne pas avoir d'espace vide au-dessus, 
      // et elle descendra assez bas pour rencontrer le texte.
      const fgDy = 0; 

      ctx.fillStyle = "#080706";
      ctx.fillRect(0, 0, cvsW, cvsH);

      ctx.globalAlpha = 1;
      ctx.drawImage(imgToDraw, fgDx, fgDy, fgDrawW, fgDrawH);

      // FONDRE LE BAS (Fade out vers le texte)
      // On commence le fondu un peu avant la fin de l'image
      const fadeHeight = cvsH * 0.25;
      const fadeStart = Math.max(0, fgDy + fgDrawH - fadeHeight);
      
      const fade = ctx.createLinearGradient(0, fadeStart, 0, fgDy + fgDrawH);
      fade.addColorStop(0, "rgba(8, 7, 6, 0)");
      fade.addColorStop(0.8, "rgba(8, 7, 6, 0.95)");
      fade.addColorStop(1, "#080706");
      
      ctx.fillStyle = fade;
      // On remplit jusqu'en bas de l'écran avec la couleur pleine pour boucher le trou
      ctx.fillRect(0, fadeStart, cvsW, cvsH - fadeStart);

    } else {
      // --- DESKTOP PREMIUM COVER ---
      let baseScale = Math.max(scaleX, scaleY) * WATERMARK_CROP_SCALE;
      const focalX = 0.5;
      const focalY = 0.5;

      const drawW = imgW * baseScale;
      const drawH = imgH * baseScale;
      const dx = (cvsW / 2) - (drawW * focalX);
      const dy = (cvsH / 2) - (drawH * focalY);

      ctx.fillStyle = "#080706";
      ctx.fillRect(0, 0, cvsW, cvsH);
      ctx.drawImage(imgToDraw, dx, dy, drawW, drawH);
    }
  }, []);

  // Logique de chargement intelligent
  const loadFrame = useCallback((index: number, priority: "high" | "low" | "auto" = "auto"): HTMLImageElement | null => {
    if (index < 0 || index >= frameConfig.frameCount) return null;
    
    if (imagesRef.current[index]) return imagesRef.current[index];
    
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = priority;
    img.src = frameConfig.framePath(index);
    img.onload = () => {
      imagesRef.current[index] = img;
      // Redessiner si c'est la frame courante (pour éviter le noir)
      const expectedFrame = Math.round(progressRef.current * (frameConfig.frameCount - 1));
      if (expectedFrame === index || currentDrawnFrameRef.current === -1) {
        drawFrame(progressRef.current);
      }
    };
    return null; // Pas encore chargée
  }, [drawFrame]);

  // Enregistrer la référence
  useEffect(() => {
    loadFrameRef.current = loadFrame;
  }, [loadFrame]);

  // Préchargement de base
  useEffect(() => {
    if (reducedMotion) return;
    
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const step = isMobile ? 3 : 1; // Mobile: 1 frame sur 3 (~12Mo), Desktop: toutes (~36Mo)
    
    // 1. Charger la première image immédiatement
    loadFrame(0, "high");
    
    // 2. Charger les keyframes des chapitres en priorité haute
    videoChapters.forEach(c => {
      const frameIdx = Math.round(c.start * (frameConfig.frameCount - 1));
      loadFrame(frameIdx, "high");
    });

    // 3. Charger le reste en tâche de fond
    let currentIndex = 0;
    let idleId: number;

    const idleLoad = () => {
      let loadedInThisBatch = 0;
      while (currentIndex < frameConfig.frameCount && loadedInThisBatch < 4) {
        if (currentIndex % step === 0 && !imagesRef.current[currentIndex]) {
          loadFrame(currentIndex, "low");
          loadedInThisBatch++;
        }
        currentIndex++;
      }
      
      if (currentIndex < frameConfig.frameCount) {
        idleId = window.requestIdleCallback ? window.requestIdleCallback(idleLoad) : window.setTimeout(idleLoad, 100);
      }
    };

    idleId = window.requestIdleCallback ? window.requestIdleCallback(idleLoad) : window.setTimeout(idleLoad, 500);

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, [reducedMotion, loadFrame]);

  // Scroll Sync
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

      if (!reducedMotion) {
        drawFrame(progress);
      }
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(updateFromScroll);
    };

    schedule(); // Initial draw
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, drawFrame]);

  // Fallback si Reduced Motion
  if (reducedMotion) {
    return (
      <section id="experience" className="relative h-[100svh] overflow-clip bg-[#080706]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frameConfig.framePath(0)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 z-30 flex items-end px-5 pb-14 pt-28 sm:px-10 sm:pb-20 md:items-center md:pb-0 lg:px-16">
          <div className="mx-auto w-full max-w-7xl">
            <DynamicVideoText chapter={videoChapters[0]} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="scroll-video-section relative overflow-clip bg-[#080706]"
      aria-label="Expérience Vistaire"
    >
      <div className="video-sticky-viewport sticky top-0 overflow-hidden bg-[#080706]">
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />

        {/* Overlays premium pour la lisibilité et l'ambiance */}
        <div className="video-readable-overlay absolute inset-0 z-10" />
        <div className="video-warmth absolute inset-0 z-10" />
        <div className="video-grain absolute inset-0 z-10" />

        {/* Ombre portée coin inférieur droit (profondeur) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 z-20 h-28 w-44 bg-gradient-to-br from-[#080706]/0 via-[#080706]/88 to-[#080706] md:h-24 md:w-44"
        />

        <div className="absolute inset-0 z-30 flex items-end px-5 pb-14 pt-28 sm:px-10 sm:pb-20 md:items-center md:pb-0 lg:px-16">
          <div className="mx-auto w-full max-w-7xl">
            <DynamicVideoText chapter={chapter} />
          </div>
        </div>

        {/* Gradient de fondu en bas pour transition vers la section suivante */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-[#080706] via-[#080706]/72 to-transparent" />
      </div>
    </section>
  );
}
