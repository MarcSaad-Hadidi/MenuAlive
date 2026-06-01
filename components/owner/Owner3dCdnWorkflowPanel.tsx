"use client";

import { useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { Badge } from "@/components/owner/OwnerUi";
import type {
  CdnWorkflowState,
  CdnWorkflowVariant
} from "@/lib/owner/threeDCdnWorkflow";

type Owner3dCdnWorkflowPanelProps = {
  cdn: CdnWorkflowState;
};

type CdnApiPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  manualCommand?: string;
  state?: CdnWorkflowState;
};

const CDN_VARIANT_LABELS: Record<CdnWorkflowVariant["variant"], string> = {
  web: "web",
  mobile: "mobile",
  arLite: "arLite",
  iosUsdz: "iosUsdz",
  poster: "poster"
};

function identityParams(state: CdnWorkflowState): URLSearchParams {
  return new URLSearchParams({
    restaurantSlug: state.identity.restaurantSlug,
    menuSlug: state.identity.menuSlug,
    dishSlug: state.identity.dishSlug,
    version: state.identity.version
  });
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortSha(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value || "Missing";
}

function HeaderChips({ variant }: { variant: CdnWorkflowVariant }) {
  return (
    <div className={styles.cdnHeaderChips}>
      {Object.entries(variant.requiredHeaders).map(([key, value]) => (
        <span key={key}>
          {key}: {value}
        </span>
      ))}
    </div>
  );
}

function NetworkEvidence({ variant }: { variant: CdnWorkflowVariant }) {
  if (!variant.network.status && variant.network.warnings.length === 0) {
    return <span className={styles.cellSub}>No network report yet.</span>;
  }
  return (
    <dl className={styles.cdnEvidenceList}>
      <div>
        <dt>HEAD / GET</dt>
        <dd>
          {variant.network.status ?? "?"} / {variant.network.getStatus ?? "?"}
        </dd>
      </div>
      <div>
        <dt>Header / fetched bytes</dt>
        <dd>
          {variant.network.contentLength ?? "Missing"} / {variant.network.fetchedBytes ?? "Missing"}
        </dd>
      </div>
      <div>
        <dt>Fetched SHA-256</dt>
        <dd>{shortSha(variant.network.fetchedSha256)}</dd>
      </div>
      <div>
        <dt>Headers</dt>
        <dd>
          {variant.network.contentType || "Missing content-type"}
          {variant.network.cacheControl ? ` / ${variant.network.cacheControl}` : ""}
        </dd>
      </div>
      {variant.network.warnings.length > 0 ? (
        <div>
          <dt>Warnings</dt>
          <dd>{variant.network.warnings.join(" ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function Owner3dCdnWorkflowPanel({ cdn }: Owner3dCdnWorkflowPanelProps) {
  const [state, setState] = useState(cdn);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"refresh" | "validate" | null>(null);
  const [showCommands, setShowCommands] = useState(false);

  async function refreshStatus() {
    setBusy("refresh");
    setMessage("");
    try {
      const response = await fetch(`/api/owner/3d-ar/cdn?${identityParams(state).toString()}`);
      const payload = (await response.json().catch(() => ({}))) as CdnApiPayload;
      if (response.ok && payload.state) setState(payload.state);
      setMessage(response.ok ? payload.message || "CDN status refreshed." : payload.error || "CDN status unavailable.");
    } finally {
      setBusy(null);
    }
  }

  async function validateNetwork() {
    setBusy("validate");
    setMessage("");
    try {
      const response = await fetch("/api/owner/3d-ar/cdn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_network",
          identity: state.identity
        })
      });
      const payload = (await response.json().catch(() => ({}))) as CdnApiPayload;
      if (payload.state) setState(payload.state);
      setMessage(
        payload.message ||
          payload.error ||
          payload.manualCommand ||
          (response.ok ? "Network validation refreshed." : "Run the manual validation command.")
      );
      setShowCommands(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.cdnWorkflowPanel} aria-label="CDN storage workflow">
      <div className={styles.pipelineSectionTitleRow}>
        <div>
          <p className={styles.sourceUploadEyebrow}>CDN / storage</p>
          <h2 className={styles.moduleTitle}>Upload plan</h2>
          <p className={styles.moduleSub}>
            Versioned runtime assets stay outside Git. This dashboard reads manifests and reports; it does not fake CDN uploads.
          </p>
        </div>
        <Badge tone={state.readyToFinalize ? "ready" : "warn"}>
          {state.readyToFinalize ? "Ready to finalize" : "CDN validation required"}
        </Badge>
      </div>

      <div className={styles.cdnStatusGrid}>
        <div>
          <span>Storage provider</span>
          <strong>{state.storageConfigured ? state.storageStatusLabel : "storage not configured"}</strong>
        </div>
        <div>
          <span>Upload status</span>
          <strong>
            {state.uploadPlanCurrent
              ? "Upload plan generated"
              : state.uploadPlanGenerated
                ? "Upload plan stale"
                : "Plan can be generated"}
          </strong>
        </div>
        <div>
          <span>Network validation</span>
          <strong>{state.networkReportOk ? "Passed" : state.blockReason || "Report missing"}</strong>
        </div>
      </div>

      <div className={styles.cdnToolbar}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => setShowCommands((current) => !current)}
        >
          Upload plan
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={busy === "validate"}
          onClick={() => void validateNetwork()}
        >
          Validate network
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={busy === "refresh"}
          onClick={() => void refreshStatus()}
        >
          Refresh status
        </button>
      </div>

      {showCommands ? (
        <div className={styles.cdnCommandGrid}>
          <details open>
            <summary>Manual upload command</summary>
            <code className={styles.pipelineCommand}>{state.manualUploadCommand}</code>
          </details>
          <details open>
            <summary>Manual network validation command</summary>
            <code className={styles.pipelineCommand}>{state.validateNetworkCommand}</code>
          </details>
        </div>
      ) : null}

      <div className={`${styles.tableWrap} ${styles.showDesktop}`}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Local staging path</th>
              <th>Target CDN URL</th>
              <th>Bytes</th>
              <th>SHA-256</th>
              <th>Content-type</th>
              <th>Required headers</th>
              <th>Upload status</th>
            </tr>
          </thead>
          <tbody>
            {state.variants.map((variant) => (
              <tr key={variant.variant}>
                <td>{CDN_VARIANT_LABELS[variant.variant]}</td>
                <td className={styles.cdnBreakCell}>{variant.localPath || "Missing staging path"}</td>
                <td className={styles.cdnBreakCell}>
                  {variant.targetUrl || "Missing target"}
                  {variant.warning ? <p className={styles.qrWarning}>{variant.warning}</p> : null}
                </td>
                <td>{formatBytes(variant.bytes)}</td>
                <td>{shortSha(variant.sha256)}</td>
                <td>{variant.contentType}</td>
                <td>
                  <HeaderChips variant={variant} />
                </td>
                <td>
                  <Badge tone={variant.statusTone}>{variant.uploadStatusLabel}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${styles.pipelineMobileList} ${styles.showMobile}`}>
        {state.variants.map((variant) => (
          <article key={variant.variant} className={styles.cdnVariantCard}>
            <div className={styles.pipelineCardHeader}>
              <div>
                <p className={styles.moduleCardTitle}>{CDN_VARIANT_LABELS[variant.variant]}</p>
                <span className={styles.moduleCardMeta}>{variant.contentType}</span>
              </div>
              <Badge tone={variant.statusTone}>{variant.uploadStatusLabel}</Badge>
            </div>
            <dl className={styles.cdnEvidenceList}>
              <div>
                <dt>Local staging path</dt>
                <dd>{variant.localPath || "Missing staging path"}</dd>
              </div>
              <div>
                <dt>Target CDN URL</dt>
                <dd>{variant.targetUrl || "Missing target"}</dd>
              </div>
              <div>
                <dt>Bytes / SHA-256</dt>
                <dd>
                  {formatBytes(variant.bytes)} / {shortSha(variant.sha256)}
                </dd>
              </div>
            </dl>
            <HeaderChips variant={variant} />
            {variant.warning ? <p className={styles.qrWarning}>{variant.warning}</p> : null}
          </article>
        ))}
      </div>

      <section className={styles.cdnReportPanel} aria-label="Network validation report">
        <div className={styles.pipelineSectionTitleRow}>
          <div>
            <p className={styles.sourceUploadEyebrow}>Network validation report</p>
            <h3 className={styles.moduleCardTitle}>
              {state.networkReportSummary ? state.networkReportSummary.name : "No report yet"}
            </h3>
          </div>
          <Badge tone={state.networkReportOk ? "ready" : "warn"}>
            {state.networkReportOk ? "OK" : "Blocking finalize"}
          </Badge>
        </div>
        <div className={styles.cdnReportGrid}>
          {state.variants.map((variant) => (
            <article key={variant.variant}>
              <div className={styles.pipelineCardHeader}>
                <strong>{CDN_VARIANT_LABELS[variant.variant]}</strong>
                <Badge tone={variant.network.ok ? "ready" : "warn"}>
                  {variant.network.ok ? "Network OK" : "Needs validation"}
                </Badge>
              </div>
              <NetworkEvidence variant={variant} />
            </article>
          ))}
        </div>
        {state.networkReportSummary ? (
          <details className={styles.cdnRawReport}>
            <summary>Raw network validation report</summary>
            <pre>{state.networkReportSummary.raw}</pre>
          </details>
        ) : null}
      </section>

      <p className={styles.qrStatusLine} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
