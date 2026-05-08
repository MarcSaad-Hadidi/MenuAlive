"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import type { Dish } from "@/lib/demoMenuData";

const MV_INIT_TIMEOUT_MS = 12_000;
const AR_HELP_TEXT =
  "Placez le plat sur votre table avec la cam\u00e9ra de votre t\u00e9l\u00e9phone.";
const AR_UNAVAILABLE_TEXT =
  "Votre navigateur ne permet pas d\u2019ouvrir ce plat en r\u00e9alit\u00e9 augment\u00e9e. Vous pouvez le visualiser en 3D ici.";
const IOS_BRAVE_AR_TEXT =
  "Ce navigateur ne permet pas encore l\u2019ouverture AR de ce plat. Pour l\u2019exp\u00e9rience compl\u00e8te sur iPhone, ouvrez cette page dans Safari, ou visualisez le plat en 3D ici.";
const IOS_USDZ_MISSING_TEXT =
  "Pour activer l\u2019AR iPhone, ajoutez un fichier USDZ \u00e0 ce plat.";

type DishModelViewerProps = {
  dish: Pick<Dish, "name" | "model3dUrl" | "usdzUrl">;
  /** Chrome minimal : titres et aide fournis par le parent si besoin. */
  minimalChrome?: boolean;
};

export type DishModelViewerHandle = {
  /** Vrai si `activateAR` a bien été invoquée (l’AR peut encore échouer ensuite). */
  requestAr: () => boolean;
};

async function ensureModelViewerLoaded(): Promise<void> {
  await import("@google/model-viewer");
  if (!customElements.get("model-viewer")) {
    await customElements.whenDefined("model-viewer");
  }
}

type ModelViewerElement = HTMLElement & {
  canActivateAR?: boolean;
  activateAR?: () => Promise<void> | void;
};

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isBraveUserAgent(): boolean {
  return typeof navigator !== "undefined" && /Brave/i.test(navigator.userAgent);
}

export const DishModelViewer = forwardRef<
  DishModelViewerHandle,
  DishModelViewerProps
>(function DishModelViewer({ dish, minimalChrome = false }, ref) {
  const titleId = useId();
  const helpId = useId();
  const [mvReady, setMvReady] = useState(false);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(false);
  const [arLaunchFailed, setArLaunchFailed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isBrave, setIsBrave] = useState(false);
  const loadWatchRef = useRef<ModelViewerElement | null>(null);
  const hasModel = Boolean(dish.model3dUrl?.trim());
  const modelSrc = useMemo(() => dish.model3dUrl?.trim() ?? "", [dish.model3dUrl]);
  const iosSrc = useMemo(() => dish.usdzUrl?.trim() ?? "", [dish.usdzUrl]);
  const missingIosAr = isIos && !iosSrc;

  useEffect(() => {
    let cancelled = false;
    void ensureModelViewerLoaded().then(() => {
      if (!cancelled) setMvReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Lancement AR (Quick Look / Scene Viewer / WebXR).
   * Doit rester dans la pile du geste utilisateur autant que possible (pas de setTimeout avant).
   */
  const requestAr = useCallback((): boolean => {
    const el = loadWatchRef.current;

    if (!el?.activateAR || missingIosAr) {
      setArLaunchFailed(true);
      return false;
    }

    setArLaunchFailed(false);
    try {
      const result = el.activateAR();
      if (result && typeof result.then === "function") {
        result.catch(() => setArLaunchFailed(true));
      }
      return true;
    } catch {
      setArLaunchFailed(true);
      return false;
    }
  }, [missingIosAr]);

  useImperativeHandle(ref, () => ({ requestAr }), [requestAr]);

  useEffect(() => {
    queueMicrotask(() => {
      setIsIos(isIosDevice());
      setIsBrave(isBraveUserAgent());
    });
  }, []);

  useEffect(() => {
    if (!hasModel || mvReady) return;
    const t = window.setTimeout(() => setInitTimedOut(true), MV_INIT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [hasModel, mvReady]);

  useEffect(() => {
    if (!hasModel || !mvReady) return;
    let teardown: (() => void) | undefined;
    const wait = window.setTimeout(() => {
      const el = loadWatchRef.current;
      if (!el) return;
      const onMvError = () => setModelLoadError(true);
      const onMvLoad = () => setModelLoadError(false);
      const onArStatus = () => setArLaunchFailed(false);
      el.addEventListener("error", onMvError);
      el.addEventListener("load", onMvLoad);
      el.addEventListener("ar-status", onArStatus);
      teardown = () => {
        el.removeEventListener("error", onMvError);
        el.removeEventListener("load", onMvLoad);
        el.removeEventListener("ar-status", onArStatus);
      };
    }, 0);
    return () => {
      window.clearTimeout(wait);
      teardown?.();
    };
  }, [hasModel, mvReady, modelSrc]);

  if (!hasModel) {
    return (
      <section
        className="overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-[#14100c] via-[#0f0b08] to-[#080706] shadow-inner"
        aria-labelledby={titleId}
      >
        <div className="flex min-h-[200px] flex-col items-center justify-center px-5 py-10 text-center sm:min-h-[240px]">
          <div
            className="mb-5 h-20 w-20 rounded-2xl border border-dashed border-champagne/28 bg-black/40 shadow-[inset_0_0_36px_rgba(217,184,121,0.05)]"
            aria-hidden
          />
          <p
            id={titleId}
            className="max-w-md font-display text-base leading-relaxed text-[#d8caba] sm:text-lg"
          >
            Ce plat sera bientôt disponible en 3D.
          </p>
        </div>
      </section>
    );
  }

  const showLoader = !mvReady && !initTimedOut;
  const showInitFail = !mvReady && initTimedOut;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/[0.14] bg-gradient-to-b from-[#14100c] to-[#070605] p-3 shadow-[inset_0_1px_0_rgba(217,184,121,0.08)] transition-opacity duration-300 sm:p-4"
      aria-labelledby={minimalChrome ? undefined : titleId}
    >
      {!minimalChrome ? (
        <div className="mb-2 text-center sm:mb-3">
          <h3 id={titleId} className="font-display text-lg text-cream sm:text-xl">
            {dish.name}
          </h3>
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-lg">
        {showInitFail ? (
          <div className="flex min-h-[min(65vh,460px)] w-full flex-col items-center justify-center gap-3 rounded-xl bg-[#10100e] px-6 text-center text-sm text-[#c4a892] ring-1 ring-white/8">
            <p>Affichage impossible pour le moment.</p>
            <p className="text-xs text-[#7d6e5c]">Actualisez la page.</p>
          </div>
        ) : (
          <div className="relative">
            {showLoader ? (
              <div
                className="absolute inset-0 z-20 flex h-[min(58vh,420px)] min-h-[280px] w-full animate-pulse items-center justify-center rounded-xl bg-[#10100e]/95 ring-1 ring-white/8 sm:h-[min(65vh,460px)] sm:min-h-[340px]"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <span className="text-sm text-[#9a8b78]">Chargement…</span>
              </div>
            ) : null}
            {mvReady ? (
              <model-viewer
                ref={loadWatchRef}
                src={modelSrc}
                {...(iosSrc ? { "ios-src": iosSrc } : {})}
                alt={`Vue du plat : ${dish.name}`}
                aria-describedby={helpId}
                camera-controls
                auto-rotate
                ar
                ar-modes="quick-look scene-viewer webxr"
                ar-placement="floor"
                ar-scale="fixed"
                shadow-intensity="1"
                exposure="1.05"
                loading="auto"
                camera-orbit="0deg 72deg 105%"
                camera-target="0m 0.04m 0m"
                field-of-view="32deg"
                min-camera-orbit="auto auto 50%"
                max-camera-orbit="auto auto 140%"
                className="mx-auto block h-[min(58vh,420px)] min-h-[280px] w-full rounded-xl bg-[#10100e] ring-1 ring-white/8 sm:h-[min(65vh,460px)] sm:min-h-[340px]"
              >
                <button
                  type="button"
                  slot="ar-button"
                  className="absolute bottom-4 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center justify-center rounded-full border border-champagne/45 bg-[#080706]/92 px-5 text-sm font-semibold text-champagne shadow-[0_14px_40px_rgba(0,0,0,0.48)] backdrop-blur transition hover:border-champagne/70 hover:bg-[#120d09] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-[#10100e]"
                >
                  Ouvrir en réalité augmentée
                </button>
              </model-viewer>
            ) : (
              <div
                className="h-[min(58vh,420px)] min-h-[280px] w-full rounded-xl bg-[#10100e] ring-1 ring-white/8 sm:h-[min(65vh,460px)] sm:min-h-[340px]"
                aria-hidden
              />
            )}
            <div className="mt-3 space-y-1.5 px-1 text-center text-xs leading-relaxed text-[#bba88f] sm:text-sm">
              <p id={helpId}>{AR_HELP_TEXT}</p>
              {arLaunchFailed ? (
                <p className="text-[#8f806d]">
                  {isIos && isBrave ? IOS_BRAVE_AR_TEXT : AR_UNAVAILABLE_TEXT}
                </p>
              ) : null}
              {missingIosAr ? (
                <p className="text-[#c4a892]">{IOS_USDZ_MISSING_TEXT}</p>
              ) : null}
            </div>
            {modelLoadError ? (
              <p className="mt-2 text-center text-xs text-[#c49a84]">
                Le modèle ne s’affiche pas. Réessayez dans un instant.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
});
