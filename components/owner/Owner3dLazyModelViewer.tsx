"use client";

import { createElement, useEffect, useRef, useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";
import type { VisualReviewModelDescriptor } from "@/lib/owner/threeDVisualReviewModel";

type Owner3dLazyModelViewerProps = {
  sourceModel: VisualReviewModelDescriptor | null;
  candidateModel: VisualReviewModelDescriptor | null;
};

type ViewerPane = "source" | "candidate";

type ModelViewerElement = HTMLElement & {
  cameraOrbit?: string;
  jumpCameraToGoal?: () => void;
};

type PaneProps = {
  pane: ViewerPane;
  title: string;
  model: VisualReviewModelDescriptor | null;
  loaded: boolean;
  loading: boolean;
  onLoad: (pane: ViewerPane) => void;
  modelRef: (node: ModelViewerElement | null) => void;
};

function ReviewModelPane({
  pane,
  title,
  model,
  loaded,
  loading,
  onLoad,
  modelRef
}: PaneProps) {
  const buttonLabel = pane === "source" ? "Load source model" : "Load candidate model";

  return (
    <section className={styles.reviewModelPane} aria-label={title}>
      <div className={styles.reviewModelPaneHeader}>
        <div>
          <p className={styles.sourceUploadEyebrow}>{pane}</p>
          <h3 className={styles.panelTitle}>{title}</h3>
        </div>
        {model ? <span className={styles.sourceTag}>{model.origin}</span> : null}
      </div>

      {loaded && model ? (
        <div className={styles.reviewModelStage}>
          {/*
            The custom element is created only after an explicit click. No model
            URL, poster, mobile AR attribute, or USDZ reference exists before that.
          */}
          {ReactCreateModelViewer({
            ref: modelRef,
            src: model.url,
            "data-testid": pane === "source" ? "owner-3d-model-source" : "owner-3d-model-candidate",
            className: styles.reviewModelViewer,
            "camera-controls": true,
            "interaction-prompt": "none",
            "disable-tap": true,
            loading: "eager",
            reveal: "auto"
          })}
        </div>
      ) : (
        <div className={styles.reviewModelPlaceholder}>
          <p>
            {model
              ? "Model is ready for explicit owner inspection."
              : "No safe browser model URL is available for this side."}
          </p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => onLoad(pane)}
            disabled={!model || loading}
            aria-busy={loading}
          >
            {loading ? "Loading viewer" : buttonLabel}
          </button>
        </div>
      )}
    </section>
  );
}

function ReactCreateModelViewer(props: Record<string, unknown>) {
  return createElement("model-viewer", props);
}

export function Owner3dLazyModelViewer({
  sourceModel,
  candidateModel
}: Owner3dLazyModelViewerProps) {
  const sourceRef = useRef<ModelViewerElement | null>(null);
  const candidateRef = useRef<ModelViewerElement | null>(null);
  const syncGuard = useRef(false);
  const [loaded, setLoaded] = useState<Record<ViewerPane, boolean>>({
    source: false,
    candidate: false
  });
  const [loading, setLoading] = useState<Record<ViewerPane, boolean>>({
    source: false,
    candidate: false
  });
  const [syncCamera, setSyncCamera] = useState(false);

  async function loadPane(pane: ViewerPane) {
    setLoading((current) => ({ ...current, [pane]: true }));
    try {
      await import("@google/model-viewer");
      setLoaded((current) => ({ ...current, [pane]: true }));
    } finally {
      setLoading((current) => ({ ...current, [pane]: false }));
    }
  }

  useEffect(() => {
    if (!syncCamera || !loaded.source || !loaded.candidate) return;
    const source = sourceRef.current;
    const candidate = candidateRef.current;
    if (!source || !candidate) return;

    const sync = (from: ModelViewerElement, to: ModelViewerElement) => {
      if (syncGuard.current) return;
      const orbit = from.cameraOrbit;
      if (!orbit) return;
      syncGuard.current = true;
      to.cameraOrbit = orbit;
      to.jumpCameraToGoal?.();
      window.setTimeout(() => {
        syncGuard.current = false;
      }, 0);
    };

    const sourceListener = () => sync(source, candidate);
    const candidateListener = () => sync(candidate, source);
    source.addEventListener("camera-change", sourceListener);
    candidate.addEventListener("camera-change", candidateListener);
    return () => {
      source.removeEventListener("camera-change", sourceListener);
      candidate.removeEventListener("camera-change", candidateListener);
    };
  }, [loaded.candidate, loaded.source, syncCamera]);

  const bothLoaded = loaded.source && loaded.candidate;

  return (
    <section className={styles.reviewModelsPanel} aria-label="3D source and candidate viewers">
      <div className={styles.pipelineSectionTitleRow}>
        <div>
          <p className={styles.sourceUploadEyebrow}>3D inspection</p>
          <h2 className={styles.moduleTitle}>Source vs candidate</h2>
        </div>
        <button
          type="button"
          className={styles.btn}
          aria-pressed={syncCamera}
          disabled={!bothLoaded}
          onClick={() => setSyncCamera((value) => !value)}
        >
          Synchronized camera
        </button>
      </div>

      <div className={styles.reviewModelGrid}>
        <ReviewModelPane
          pane="source"
          title="Source model"
          model={sourceModel}
          loaded={loaded.source}
          loading={loading.source}
          onLoad={loadPane}
          modelRef={(node) => {
            sourceRef.current = node;
          }}
        />
        <ReviewModelPane
          pane="candidate"
          title="Selected candidate"
          model={candidateModel}
          loaded={loaded.candidate}
          loading={loading.candidate}
          onLoad={loadPane}
          modelRef={(node) => {
            candidateRef.current = node;
          }}
        />
      </div>
    </section>
  );
}
