"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { Badge } from "@/components/owner/OwnerUi";
import type { Owner3dPipelineAsset } from "@/lib/owner/threeDArPipeline";
import {
  lifecycleRollbackConfirmation,
  rollbackCommandForTarget,
  validateLifecycleConfirmation,
  type LifecycleGateStatus,
  type Owner3dAuditEvent,
  type Owner3dEvidenceLink
} from "@/lib/owner/threeDLifecycleModel";

type Owner3dLifecyclePanelProps = {
  asset: Owner3dPipelineAsset;
  versions: Owner3dPipelineAsset[];
};

type LifecycleApiPayload = {
  ok?: boolean;
  configured?: boolean;
  events?: Owner3dAuditEvent[];
  event?: Owner3dAuditEvent;
  error?: string;
  message?: string;
  manualCommand?: string;
};

type RollbackTarget = {
  version: string;
  href: string;
  statusLabel: string;
  statusTone: Owner3dPipelineAsset["statusTone"];
  selectedCandidate: string;
  lastRun: string;
  manifestPath: string | null;
  publishedAt: string | null;
  finalizedAt: string | null;
  cdnReady: boolean;
  eligible: boolean;
  reason: string;
};

function gateTone(status: LifecycleGateStatus): "ready" | "warn" | "danger" | "muted" {
  if (status === "passed") return "ready";
  if (status === "failed") return "danger";
  if (status === "warning") return "warn";
  return "muted";
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function shortValue(value: string): string {
  if (!value) return "";
  return value.length > 36 ? `${value.slice(0, 18)}...${value.slice(-12)}` : value;
}

function evidenceLabel(evidence: Owner3dEvidenceLink): string {
  if (evidence.path) return evidence.path;
  if (evidence.url) return evidence.url;
  if (evidence.sha256) return evidence.sha256;
  return evidence.private ? "Private evidence" : "Evidence recorded";
}

function EvidenceList({ links }: { links: Owner3dEvidenceLink[] }) {
  if (links.length === 0) {
    return <span className={styles.cellSub}>No evidence link recorded.</span>;
  }

  return (
    <ul className={styles.lifecycleEvidenceList}>
      {links.map((link, index) => (
        <li key={`${link.label}-${index}`}>
          <span>{link.label}</span>
          <code>{shortValue(evidenceLabel(link))}</code>
        </li>
      ))}
    </ul>
  );
}

function rollbackTargets(
  asset: Owner3dPipelineAsset,
  versions: Owner3dPipelineAsset[]
): RollbackTarget[] {
  return versions
    .filter((version) => version.version !== asset.version)
    .map((version) => {
      const hasPublishedProof =
        version.status === "published" || Boolean(version.lifecycle.publishedAt);
      return {
        version: version.version,
        href: version.versionHref,
        statusLabel: version.statusLabel,
        statusTone: version.statusTone,
        selectedCandidate: version.selectedCandidate,
        lastRun: version.lastRun,
        manifestPath: version.manifestPath,
        publishedAt: version.lifecycle.publishedAt,
        finalizedAt: version.lifecycle.finalizedAt,
        cdnReady: version.cdn.readyToFinalize,
        eligible: hasPublishedProof,
        reason: hasPublishedProof
          ? "Published version evidence is present."
          : "Rollback target must have published lifecycle evidence."
      };
    });
}

function identityParams(asset: Owner3dPipelineAsset): URLSearchParams {
  return new URLSearchParams({
    restaurantSlug: asset.restaurantSlug,
    menuSlug: asset.menuSlug,
    dishSlug: asset.dishSlug,
    version: asset.version
  });
}

function ActionConfirmation({
  id,
  label,
  expected,
  value,
  disabled,
  onChange
}: {
  id: string;
  label: string;
  expected: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.lifecycleConfirm} htmlFor={id}>
      <span>{label}</span>
      <code>{expected}</code>
      <input
        id={id}
        className={styles.lifecycleInput}
        value={value}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AuditEvent({ event }: { event: Owner3dAuditEvent }) {
  return (
    <article className={styles.auditEvent}>
      <div className={styles.auditEventHeader}>
        <div>
          <p className={styles.moduleCardTitle}>{event.action.replaceAll("_", " ")}</p>
          <span className={styles.moduleCardMeta}>
            {event.actor.label} / {formatTimestamp(event.timestamp)}
          </span>
        </div>
        <Badge tone={event.persisted ? "ready" : "muted"}>
          {event.persisted ? "Persisted" : "Inferred"}
        </Badge>
      </div>
      <dl className={styles.lifecycleMiniGrid}>
        <div>
          <dt>Old state</dt>
          <dd>{event.oldState ?? "None"}</dd>
        </div>
        <div>
          <dt>New state</dt>
          <dd>{event.newState ?? "None"}</dd>
        </div>
      </dl>
      {event.reason ? <p className={styles.cellSub}>{event.reason}</p> : null}
      <EvidenceList links={event.evidenceLinks} />
    </article>
  );
}

export function Owner3dLifecyclePanel({ asset, versions }: Owner3dLifecyclePanelProps) {
  const lifecycle = asset.lifecycle;
  const targets = useMemo(() => rollbackTargets(asset, versions), [asset, versions]);
  const firstEligibleTarget = targets.find((target) => target.eligible)?.version ?? "";
  const [targetVersion, setTargetVersion] = useState(firstEligibleTarget);
  const [finalizeText, setFinalizeText] = useState("");
  const [publishText, setPublishText] = useState("");
  const [rollbackText, setRollbackText] = useState("");
  const [message, setMessage] = useState("");
  const [auditEvents, setAuditEvents] = useState(lifecycle.auditEvents);
  const [pendingAction, setPendingAction] = useState<"finalize" | "publish" | "rollback" | null>(null);

  const selectedTarget =
    targets.find((target) => target.version === targetVersion) ?? targets[0] ?? null;
  const rollbackExpected = selectedTarget
    ? lifecycleRollbackConfirmation(lifecycle.identity, selectedTarget.version)
    : `${lifecycle.confirmations.rollbackPrefix}<version>`;
  const finalizeValidation = validateLifecycleConfirmation({
    action: "finalize",
    state: lifecycle,
    typed: finalizeText
  });
  const publishValidation = validateLifecycleConfirmation({
    action: "publish",
    state: lifecycle,
    typed: publishText
  });
  const rollbackValidation = validateLifecycleConfirmation({
    action: "rollback",
    state: lifecycle,
    typed: rollbackText,
    targetVersion: selectedTarget?.eligible ? selectedTarget.version : null
  });
  const rollbackCommand = selectedTarget
    ? rollbackCommandForTarget(lifecycle.identity, selectedTarget.version)
    : lifecycle.rollbackCommandTemplate;

  useEffect(() => {
    let active = true;

    async function loadAuditEvents() {
      try {
        const response = await fetch(
          `/api/owner/3d-ar/lifecycle?${identityParams(asset).toString()}`
        );
        const payload = (await response.json().catch(() => ({}))) as LifecycleApiPayload;
        if (!active) return;
        if (response.ok && payload.events) {
          setAuditEvents(payload.events);
        }
      } catch {
        if (active) setMessage("Audit timeline is using manifest/report fallback events.");
      }
    }

    void loadAuditEvents();
    return () => {
      active = false;
    };
  }, [asset]);

  async function submitLifecycleAction(action: "finalize" | "publish" | "rollback") {
    const confirmation =
      action === "finalize"
        ? finalizeText
        : action === "publish"
          ? publishText
          : rollbackText;
    setMessage("");
    setPendingAction(action);
    try {
      const response = await fetch("/api/owner/3d-ar/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          confirmation,
          targetVersion: action === "rollback" ? selectedTarget?.version : null,
          identity: lifecycle.identity
        })
      });
      const payload = (await response.json().catch(() => ({}))) as LifecycleApiPayload;
      if (response.ok && payload.event) {
        setAuditEvents((current) => [payload.event as Owner3dAuditEvent, ...current]);
        if (action === "publish") setPublishText("");
        if (action === "rollback") setRollbackText("");
      }
      setMessage(
        payload.message ||
          payload.error ||
          payload.manualCommand ||
          "Lifecycle request completed without changing manifest state."
      );
    } catch {
      setMessage("Lifecycle audit request unavailable. Use the visible manual command.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className={styles.lifecyclePanel} aria-label="Finalize publish rollback lifecycle">
      <div className={styles.pipelineSectionTitleRow}>
        <div>
          <p className={styles.sourceUploadEyebrow}>Manifest lifecycle</p>
          <h2 className={styles.moduleTitle}>Finalize panel</h2>
          <p className={styles.moduleSub}>
            Gates are read from manifests, reports and CDN validation. The dashboard never claims a publish or rollback until the runner writes the manifest state.
          </p>
        </div>
        <Badge tone={lifecycle.canPublish ? "ready" : lifecycle.canFinalize ? "warn" : "muted"}>
          {lifecycle.canPublish
            ? "Ready to publish"
            : lifecycle.canFinalize
              ? "Ready to finalize"
              : "Blocked"}
        </Badge>
      </div>

      <div className={styles.lifecycleGateList}>
        {lifecycle.gates.map((item) => (
          <article key={item.id} className={styles.lifecycleGate}>
            <div className={styles.pipelineCardHeader}>
              <strong>{item.label}</strong>
              <Badge tone={gateTone(item.status)}>{item.status}</Badge>
            </div>
            <p>{item.summary}</p>
            <span>{item.detail}</span>
            <EvidenceList links={item.evidenceLinks} />
          </article>
        ))}
      </div>

      <div className={styles.lifecycleGrid}>
        <section className={styles.lifecycleCard} aria-label="Finalize panel">
          <div className={styles.pipelineSectionTitleRow}>
            <h3 className={styles.drawerSectionTitle}>Finalize panel</h3>
            <Badge tone={lifecycle.canFinalize ? "ready" : "warn"}>
              {lifecycle.canFinalize ? "Unlocked by gates" : "Blocked"}
            </Badge>
          </div>
          <p className={styles.cellSub}>
            Finalize writes the version manifest to approved. It does not publish and does not switch the active version.
          </p>
          <ActionConfirmation
            id="lifecycle-finalize-confirm"
            label="Typed confirmation"
            expected={lifecycle.confirmations.finalize}
            value={finalizeText}
            disabled={!lifecycle.canFinalize || pendingAction !== null}
            onChange={setFinalizeText}
          />
          <button
            type="button"
            data-testid="owner-3d-finalize-submit"
            aria-busy={pendingAction === "finalize"}
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!lifecycle.canFinalize || !finalizeValidation.ok || pendingAction !== null}
            onClick={() => void submitLifecycleAction("finalize")}
          >
            Confirm finalize command
          </button>
          {!lifecycle.canFinalize ? (
            <p className={styles.qrWarning}>{lifecycle.finalizeDisabledReason}</p>
          ) : null}
          <code className={styles.pipelineCommand}>{lifecycle.finalizationCommand}</code>
        </section>

        <section className={styles.lifecycleCard} aria-label="Publish panel">
          <div className={styles.pipelineSectionTitleRow}>
            <h3 className={styles.drawerSectionTitle}>Publish panel</h3>
            <Badge tone={lifecycle.canPublish ? "ready" : "warn"}>
              {lifecycle.canPublish ? "Approved manifest" : "Blocked"}
            </Badge>
          </div>
          <dl className={styles.lifecycleEffects}>
            <div>
              <dt>Writes active version</dt>
              <dd>{lifecycle.effects.publishWritesActiveVersion ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Refreshes restaurant manifest</dt>
              <dd>{lifecycle.effects.publishRefreshesRestaurantManifest ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Deletes previous</dt>
              <dd>{lifecycle.effects.publishDeletesPrevious ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <ActionConfirmation
            id="lifecycle-publish-confirm"
            label="Typed confirmation"
            expected={lifecycle.confirmations.publish}
            value={publishText}
            disabled={!lifecycle.canPublish || pendingAction !== null}
            onChange={setPublishText}
          />
          <button
            type="button"
            data-testid="owner-3d-publish-submit"
            aria-busy={pendingAction === "publish"}
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!lifecycle.canPublish || !publishValidation.ok || pendingAction !== null}
            onClick={() => void submitLifecycleAction("publish")}
          >
            Confirm publish command
          </button>
          {!lifecycle.canPublish ? (
            <p className={styles.qrWarning}>{lifecycle.publishDisabledReason}</p>
          ) : null}
          <code className={styles.pipelineCommand}>{lifecycle.publishCommand}</code>
        </section>

        <section className={styles.lifecycleCard} aria-label="Rollback panel">
          <div className={styles.pipelineSectionTitleRow}>
            <h3 className={styles.drawerSectionTitle}>Rollback panel</h3>
            <Badge tone={selectedTarget?.eligible ? "warn" : "muted"}>
              {selectedTarget?.eligible ? "Target selected" : "No rollback target"}
            </Badge>
          </div>
          <div className={styles.rollbackTargetList}>
            {targets.length === 0 ? (
              <p className={styles.emptyState}>No previous versions detected for this dish.</p>
            ) : (
              targets.map((target) => (
                <button
                  key={target.version}
                  type="button"
                  className={`${styles.rollbackTargetButton} ${
                    target.version === selectedTarget?.version ? styles.rollbackTargetButtonActive : ""
                  }`}
                  disabled={!target.eligible || pendingAction !== null}
                  onClick={() => {
                    setTargetVersion(target.version);
                    setRollbackText("");
                    setMessage("");
                  }}
                  aria-disabled={pendingAction !== null || undefined}
                >
                  <span>{target.version}</span>
                  <Badge tone={target.eligible ? target.statusTone : "muted"}>
                    {target.eligible ? target.statusLabel : "Not eligible"}
                  </Badge>
                </button>
              ))
            )}
          </div>
          {selectedTarget ? (
            <div className={styles.rollbackCompareGrid}>
              <div>
                <span>Current</span>
                <strong>{asset.version}</strong>
                <p>{asset.statusLabel}</p>
              </div>
              <div>
                <span>Target</span>
                <strong>{selectedTarget.version}</strong>
                <p>{selectedTarget.reason}</p>
              </div>
            </div>
          ) : null}
          <ActionConfirmation
            id="lifecycle-rollback-confirm"
            label="Typed confirmation"
            expected={rollbackExpected}
            value={rollbackText}
            disabled={!selectedTarget?.eligible || pendingAction !== null}
            onChange={setRollbackText}
          />
          <button
            type="button"
            data-testid="owner-3d-rollback-submit"
            aria-busy={pendingAction === "rollback"}
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={!selectedTarget?.eligible || !rollbackValidation.ok || pendingAction !== null}
            onClick={() => void submitLifecycleAction("rollback")}
          >
            Confirm rollback command
          </button>
          <code className={styles.pipelineCommand}>{rollbackCommand}</code>
        </section>
      </div>

      <section className={styles.auditTimelinePanel} aria-label="Audit timeline">
        <div className={styles.pipelineSectionTitleRow}>
          <div>
            <p className={styles.sourceUploadEyebrow}>Audit timeline</p>
            <h3 className={styles.drawerSectionTitle}>Audit timeline</h3>
          </div>
          <span className={styles.sourceTag}>
            {auditEvents.length > 0
              ? "Manifest/report events shown; persisted events can be layered in later."
              : "No persisted audit events yet."}
          </span>
        </div>
        <div className={styles.auditTimeline}>
          {auditEvents.length === 0 ? (
            <p className={styles.emptyState}>No audit event is available for this version yet.</p>
          ) : (
            auditEvents.map((event) => (
              <AuditEvent key={event.id} event={event} />
            ))
          )}
        </div>
      </section>

      <p className={styles.qrStatusLine} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
