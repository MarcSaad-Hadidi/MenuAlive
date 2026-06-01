"use client";

import { useEffect, useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { Badge } from "@/components/owner/OwnerUi";
import type {
  DeviceQaState,
  DeviceQaTarget,
  DeviceQaTargetState
} from "@/lib/owner/threeDDeviceQaModel";

type Owner3dDeviceQaPanelProps = {
  deviceQa: DeviceQaState;
};

type Draft = {
  status: "passed" | "failed";
  deviceName: string;
  osVersion: string;
  browserVersion: string;
  arcoreStatus: string;
  network: string;
  testedBy: string;
  testedAt: string;
  notes: string;
  evidence: File | null;
};

const EMPTY_DRAFT: Draft = {
  status: "passed",
  deviceName: "",
  osVersion: "",
  browserVersion: "",
  arcoreStatus: "",
  network: "",
  testedBy: "",
  testedAt: "",
  notes: "",
  evidence: null
};

function defaultDraft(target: DeviceQaTarget): Draft {
  return {
    ...EMPTY_DRAFT,
    browserVersion: target === "iphoneQuickLook" ? "Safari " : "Chrome "
  };
}

function absoluteAssetUrl(url: string | null, origin = ""): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return origin ? `${origin}${url}` : url;
}

function formatEvidenceSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "No evidence";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DeviceQaCard({
  target,
  draft,
  svg,
  submitting,
  browserOrigin,
  onDraft,
  onSubmit
}: {
  target: DeviceQaTargetState;
  draft: Draft;
  svg: string;
  submitting: boolean;
  browserOrigin: string;
  onDraft: (next: Draft) => void;
  onSubmit: (status: "passed" | "failed") => void;
}) {
  const assetUrl = absoluteAssetUrl(target.assetUrl, browserOrigin);
  const descriptionId = `${target.target}-device-qa-desc`;

  return (
    <fieldset className={styles.deviceQaCard} aria-describedby={descriptionId}>
      <legend>{target.title}</legend>
      <div className={styles.deviceQaHeader}>
        <div>
          <p className={styles.sourceUploadEyebrow}>{target.requiredBrowser}</p>
          <h3 className={styles.moduleCardTitle}>{target.title}</h3>
        </div>
        <Badge tone={target.statusTone}>{target.statusLabel}</Badge>
      </div>
      <p id={descriptionId} className={styles.moduleSub}>
        Manual real-device QA only. Vistaire does not simulate this result.
      </p>

      {target.assetUrlSafe && assetUrl ? (
        <div className={styles.deviceQaQrGrid}>
          <div className={styles.deviceQaQr} aria-label={`${target.title} QR code`}>
            {svg ? (
              <span dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <span>QR</span>
            )}
          </div>
          <div className={styles.deviceQaAssetBox}>
            <span>Asset URL</span>
            <a href={assetUrl} target="_blank" rel="noreferrer">
              {assetUrl}
            </a>
          </div>
        </div>
      ) : (
        <div className={styles.visualReviewWarning}>{target.assetWarning}</div>
      )}

      <div className={styles.deviceQaInstructionGrid}>
        <div>
          <p className={styles.sourceUploadEyebrow}>Instructions</p>
          <ol>
            {target.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className={styles.sourceUploadEyebrow}>Checklist</p>
          <ul>
            {target.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.sourceUploadIdentityGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Device name</span>
          <input
            className={styles.input}
            value={draft.deviceName}
            onChange={(event) => onDraft({ ...draft, deviceName: event.target.value })}
            placeholder={target.target === "iphoneQuickLook" ? "iPhone 15 Pro" : "Pixel 8"}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>OS</span>
          <input
            className={styles.input}
            value={draft.osVersion}
            onChange={(event) => onDraft({ ...draft, osVersion: event.target.value })}
            placeholder={target.target === "iphoneQuickLook" ? "iOS 18.5" : "Android 15"}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Browser version</span>
          <input
            className={styles.input}
            value={draft.browserVersion}
            onChange={(event) => onDraft({ ...draft, browserVersion: event.target.value })}
            placeholder={target.target === "iphoneQuickLook" ? "Safari 18" : "Chrome 125"}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Network</span>
          <input
            className={styles.input}
            value={draft.network}
            onChange={(event) => onDraft({ ...draft, network: event.target.value })}
            placeholder="Wi-Fi restaurant"
          />
        </label>
        {target.target === "androidSceneViewer" ? (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>ARCore status</span>
            <input
              className={styles.input}
              value={draft.arcoreStatus}
              onChange={(event) => onDraft({ ...draft, arcoreStatus: event.target.value })}
              placeholder="ARCore installed and supported"
            />
          </label>
        ) : null}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Tested by</span>
          <input
            className={styles.input}
            value={draft.testedBy}
            onChange={(event) => onDraft({ ...draft, testedBy: event.target.value })}
            placeholder="Owner name"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Tested at</span>
          <input
            className={styles.input}
            type="datetime-local"
            value={draft.testedAt}
            onChange={(event) => onDraft({ ...draft, testedAt: event.target.value })}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Evidence upload</span>
        <input
          className={styles.input}
          type="file"
          accept=".md,.txt,.pdf,.png,.jpg,.jpeg,.webp,text/markdown,text/plain,application/pdf,image/png,image/jpeg,image/webp"
          onChange={(event) => onDraft({ ...draft, evidence: event.target.files?.[0] ?? null })}
        />
        <span className={styles.cellSub}>
          {draft.evidence
            ? `${draft.evidence.name} / ${formatEvidenceSize(draft.evidence.size)}`
            : target.evidence
              ? `${target.evidence.originalName} / ${formatEvidenceSize(target.evidence.bytes)}`
              : "Evidence is required for Pass."}
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Notes</span>
        <textarea
          className={styles.textarea}
          value={draft.notes}
          onChange={(event) => onDraft({ ...draft, notes: event.target.value })}
          placeholder="Scale, grounding, orientation, texture, fallback or failure detail."
        />
      </label>

      <details className={styles.deviceQaCommand}>
        <summary className={styles.pipelineActionSummary}>
          <span>3d:record-device-qa semantics</span>
          <small>Manual runner command</small>
        </summary>
        <code className={styles.pipelineCommand}>{target.manualCommand}</code>
      </details>

      <div className={styles.deviceQaActions}>
        <button
          type="button"
          data-testid={`owner-3d-deviceqa-${target.target}-pass`}
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={submitting || !target.assetUrlSafe || !draft.evidence}
          onClick={() => onSubmit("passed")}
        >
          Pass
        </button>
        <button
          type="button"
          data-testid={`owner-3d-deviceqa-${target.target}-fail`}
          className={`${styles.btn} ${styles.btnDanger}`}
          disabled={submitting || draft.notes.trim().length < 8}
          onClick={() => onSubmit("failed")}
        >
          Fail
        </button>
      </div>
    </fieldset>
  );
}

export function Owner3dDeviceQaPanel({ deviceQa }: Owner3dDeviceQaPanelProps) {
  const [currentDeviceQa, setCurrentDeviceQa] = useState(deviceQa);
  const [drafts, setDrafts] = useState<Record<DeviceQaTarget, Draft>>({
    iphoneQuickLook: defaultDraft("iphoneQuickLook"),
    androidSceneViewer: defaultDraft("androidSceneViewer")
  });
  const [browserOrigin, setBrowserOrigin] = useState("");
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState<DeviceQaTarget | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setBrowserOrigin(window.location.origin);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      restaurantSlug: deviceQa.identity.restaurantSlug,
      menuSlug: deviceQa.identity.menuSlug,
      dishSlug: deviceQa.identity.dishSlug,
      version: deviceQa.identity.version
    });
    async function loadStatus() {
      const response = await fetch(`/api/owner/3d-ar/device-qa?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as {
        deviceQa?: DeviceQaState;
      };
      if (!cancelled && response.ok && payload.deviceQa) {
        setCurrentDeviceQa(payload.deviceQa);
      }
    }
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [
    deviceQa.identity.restaurantSlug,
    deviceQa.identity.menuSlug,
    deviceQa.identity.dishSlug,
    deviceQa.identity.version
  ]);

  useEffect(() => {
    let cancelled = false;
    async function renderQrs() {
      const { default: QRCode } = await import("qrcode");
      const next: Record<string, string> = {};
      for (const target of currentDeviceQa.targets) {
        const assetUrl = absoluteAssetUrl(target.assetUrl, browserOrigin);
        const hasAbsoluteUrl = Boolean(target.assetUrl?.startsWith("http") || browserOrigin);
        if (target.assetUrlSafe && assetUrl) {
          if (!hasAbsoluteUrl) continue;
          next[target.target] = await QRCode.toString(assetUrl, {
            type: "svg",
            errorCorrectionLevel: "M",
            margin: 2,
            width: 156,
            color: {
              dark: "#080706",
              light: "#fff8ea"
            }
          });
        }
      }
      if (!cancelled) setQrMap(next);
    }
    void renderQrs();
    return () => {
      cancelled = true;
    };
  }, [browserOrigin, currentDeviceQa.targets]);

  async function submit(target: DeviceQaTarget, status: "passed" | "failed") {
    const draft = drafts[target];
    if (status === "failed" && draft.notes.trim().length < 8) {
      setMessage("Fail requires a clear note.");
      return;
    }
    if (status === "passed" && !draft.evidence) {
      setMessage("Evidence upload is required before recording Pass.");
      return;
    }

    const formData = new FormData();
    formData.set("restaurantSlug", currentDeviceQa.identity.restaurantSlug);
    formData.set("menuSlug", currentDeviceQa.identity.menuSlug);
    formData.set("dishSlug", currentDeviceQa.identity.dishSlug);
    formData.set("version", currentDeviceQa.identity.version);
    formData.set("target", target);
    formData.set("status", status);
    formData.set("deviceName", draft.deviceName);
    formData.set("osVersion", draft.osVersion);
    formData.set("browserVersion", draft.browserVersion);
    formData.set("arcoreStatus", draft.arcoreStatus);
    formData.set("network", draft.network);
    formData.set("testedBy", draft.testedBy);
    formData.set("testedAt", draft.testedAt);
    formData.set("notes", draft.notes);
    if (draft.evidence) formData.set("evidence", draft.evidence);

    setSubmitting(target);
    setMessage("");
    try {
      const response = await fetch("/api/owner/3d-ar/device-qa", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        currentStatus?: DeviceQaState;
      };
      if (response.ok && payload.currentStatus) {
        setCurrentDeviceQa(payload.currentStatus);
      }
      setMessage(
        response.ok
          ? payload.message || "Device QA recorded."
          : payload.error || "Device QA could not be recorded."
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <section className={styles.deviceQaPanel} aria-label="Device QA">
      <div className={styles.pipelineSectionTitleRow}>
        <div>
          <p className={styles.sourceUploadEyebrow}>Device QA</p>
          <h2 className={styles.moduleTitle}>Real-device AR validation</h2>
          <p className={styles.moduleSub}>
            iPhone Quick Look and Android Scene Viewer are manual hardware checks. No automated browser run counts as device QA.
          </p>
        </div>
        <Badge tone={currentDeviceQa.canPublish ? "ready" : "warn"}>
          {currentDeviceQa.canPublish ? "Ready after device QA" : "Device QA required"}
        </Badge>
      </div>

      {currentDeviceQa.publishBlockReason ? (
        <div className={styles.visualReviewWarning} role="status" aria-live="polite">
          {currentDeviceQa.publishBlockReason}
        </div>
      ) : null}

      <div className={styles.deviceQaGrid}>
        {currentDeviceQa.targets.map((target) => (
          <DeviceQaCard
            key={target.target}
            target={target}
            draft={drafts[target.target]}
            svg={qrMap[target.target] ?? ""}
            submitting={submitting === target.target}
            browserOrigin={browserOrigin}
            onDraft={(next) => setDrafts((current) => ({ ...current, [target.target]: next }))}
            onSubmit={(status) => void submit(target.target, status)}
          />
        ))}
      </div>

      <p className={styles.qrStatusLine} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
