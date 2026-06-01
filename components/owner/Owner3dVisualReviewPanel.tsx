"use client";

/* eslint-disable @next/next/no-img-element -- owner-auth evidence images are served through a protected route. */
import { useMemo, useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { Badge } from "@/components/owner/OwnerUi";
import { Owner3dDeviceQaPanel } from "@/components/owner/Owner3dDeviceQaPanel";
import { Owner3dLazyModelViewer } from "@/components/owner/Owner3dLazyModelViewer";
import type {
  VisualReviewAngle,
  VisualReviewImage,
  VisualReviewState
} from "@/lib/owner/threeDVisualReviewModel";
import type { DeviceQaState } from "@/lib/owner/threeDDeviceQaModel";
import type { PipelineStatusTone } from "@/lib/owner/threeDArPipelineModel";

type Owner3dVisualReviewPanelProps = {
  review: VisualReviewState & {
    restaurantName: string;
    menuName: string;
    dishName: string;
    statusLabel: string;
    statusTone: PipelineStatusTone;
    manifestPath: string | null;
    reportDirectory: string | null;
    deviceQa: DeviceQaState;
  };
};

type EvidenceMode = "gallery" | "split" | "overlay";

function MetricBadge({ status }: { status: string }) {
  const tone =
    status === "passed" ? "ready" : status === "failed" ? "danger" : "warn";
  return <Badge tone={tone}>{status}</Badge>;
}

function EvidenceImage({ image, label }: { image: VisualReviewImage | null; label: string }) {
  if (!image) {
    return (
      <div className={styles.reviewImageMissing}>
        <span>{label}</span>
        <p>Evidence image missing</p>
      </div>
    );
  }

  return (
    <figure className={styles.reviewImageTile}>
      <img
        src={image.url}
        alt={`${label} visual evidence`}
        loading="lazy"
        decoding="async"
      />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function AngleCard({ angle }: { angle: VisualReviewAngle }) {
  return (
    <article className={styles.reviewAngleCard}>
      <div className={styles.reviewAngleHeader}>
        <div>
          <p className={styles.sourceUploadEyebrow}>{angle.variant}</p>
          <h3 className={styles.moduleCardTitle}>{angle.angle}</h3>
        </div>
        <MetricBadge status={angle.status} />
      </div>
      <div className={styles.reviewImageTriplet}>
        <EvidenceImage image={angle.before} label="Before" />
        <EvidenceImage image={angle.after} label="After" />
        <EvidenceImage image={angle.diff} label="Diff" />
      </div>
    </article>
  );
}

function FocusedEvidence({
  angle,
  mode,
  opacity
}: {
  angle: VisualReviewAngle | null;
  mode: EvidenceMode;
  opacity: number;
}) {
  if (!angle) {
    return (
      <div className={styles.reviewFocusedEmpty}>
        No angle evidence is available for split view or overlay view.
      </div>
    );
  }

  if (mode === "overlay") {
    return (
      <div className={styles.reviewOverlayStage}>
        {angle.before ? (
          <img src={angle.before.url} alt={`${angle.angle} source overlay base`} />
        ) : null}
        {angle.after ? (
          <img
            src={angle.after.url}
            alt={`${angle.angle} candidate overlay`}
            style={{ opacity }}
          />
        ) : null}
        {!angle.before && !angle.after ? <p>No overlay evidence.</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.reviewSplitStage}>
      <EvidenceImage image={angle.before} label="Before" />
      <EvidenceImage image={angle.after} label="After" />
    </div>
  );
}

export function Owner3dVisualReviewPanel({ review }: Owner3dVisualReviewPanelProps) {
  const [mode, setMode] = useState<EvidenceMode>("gallery");
  const [selectedAngleId, setSelectedAngleId] = useState(review.angles[0]?.id ?? "");
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const [reviewerName, setReviewerName] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedAngle = useMemo(
    () => review.angles.find((angle) => angle.id === selectedAngleId) ?? review.angles[0] ?? null,
    [review.angles, selectedAngleId]
  );

  async function submitReview(action: "approve" | "reject") {
    if (action === "reject" && rejectNote.trim().length < 8) {
      setStatusMessage("Reject requires a clear note.");
      return;
    }
    if (action === "approve" && !review.approval.canApprove) {
      setStatusMessage(review.approval.disabledReason);
      return;
    }

    setSubmitting(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/owner/3d-ar/visual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: review.identity,
          action,
          reviewerName,
          note: rejectNote,
          expectedVisualReportSha256: review.visualReportSha256 ?? "missing",
          expectedSelectedCandidate: review.selectedCandidate
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      setStatusMessage(
        response.ok
          ? payload.message || "Visual review recorded."
          : payload.error || "Visual review could not be recorded."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.visualReviewShell} aria-label="Owner visual review">
      <div className={styles.visualReviewHero}>
        <div>
          <p className={styles.sourceUploadEyebrow}>Visual quality gate</p>
          <h1 className={styles.moduleTitle}>{review.dishName}</h1>
          <p className={styles.moduleSub}>
            {review.restaurantName} / {review.menuName} / {review.identity.version}
          </p>
        </div>
        <div className={styles.pillRow}>
          <Badge tone={review.statusTone}>{review.statusLabel}</Badge>
          <Badge tone={review.visualReportValid ? "ready" : "warn"}>
            {review.visualReportValid ? "Visual report valid" : "Needs evidence"}
          </Badge>
        </div>
      </div>

      {review.warning ? (
        <div className={styles.visualReviewWarning} role="status" aria-live="polite">
          {review.warning}
        </div>
      ) : null}

      <Owner3dLazyModelViewer
        sourceModel={review.sourceModel}
        candidateModel={review.candidateModel}
      />

      <section className={styles.visualEvidencePanel} aria-label="Before after diff evidence">
        <div className={styles.pipelineSectionTitleRow}>
          <div>
            <p className={styles.sourceUploadEyebrow}>Rendered evidence</p>
            <h2 className={styles.moduleTitle}>Before / after / diff</h2>
          </div>
          <div className={styles.reviewModeControls} role="group" aria-label="Visual evidence mode">
            {(["gallery", "split", "overlay"] as EvidenceMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={styles.btn}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                {item === "gallery" ? "Gallery" : item === "split" ? "Split view" : "Overlay view"}
              </button>
            ))}
          </div>
        </div>

        {mode === "gallery" ? (
          <div className={styles.reviewAngleGrid}>
            {review.angles.length > 0 ? (
              review.angles.map((angle) => <AngleCard key={angle.id} angle={angle} />)
            ) : (
              <p className={styles.emptyState}>No before/after/diff screenshots are available.</p>
            )}
          </div>
        ) : (
          <div className={styles.reviewFocusedPanel}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Angle</span>
              <select
                className={styles.select}
                value={selectedAngle?.id ?? ""}
                onChange={(event) => setSelectedAngleId(event.target.value)}
              >
                {review.angles.map((angle) => (
                  <option key={angle.id} value={angle.id}>
                    {angle.variant} / {angle.angle}
                  </option>
                ))}
              </select>
            </label>
            {mode === "overlay" ? (
              <label className={styles.rangeField}>
                <span>Candidate opacity: {Math.round(overlayOpacity * 100)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(event) => setOverlayOpacity(Number(event.target.value))}
                />
              </label>
            ) : null}
            <FocusedEvidence angle={selectedAngle} mode={mode} opacity={overlayOpacity} />
          </div>
        )}
      </section>

      <section className={styles.reviewMetricsPanel} aria-label="Visual metrics table">
        <div>
          <p className={styles.sourceUploadEyebrow}>Metrics</p>
          <h2 className={styles.moduleTitle}>Strict comparison</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {review.summaryMetrics.map((metric) => (
                <tr key={metric.label}>
                  <td>{metric.label}</td>
                  <td>{metric.value}</td>
                  <td>
                    <MetricBadge status={metric.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.reviewDecisionGrid} aria-label="Candidate decisions">
        <article className={styles.reviewDecisionCard}>
          <p className={styles.sourceUploadEyebrow}>Selected candidate</p>
          <h3 className={styles.moduleCardTitle}>{review.selectedCandidate}</h3>
          <p>{review.selectedCandidateReason}</p>
        </article>
        <article className={styles.reviewDecisionCard}>
          <p className={styles.sourceUploadEyebrow}>Rejected candidates</p>
          {review.rejectedCandidates.length > 0 ? (
            review.rejectedCandidates.map((candidate) => (
              <div key={candidate.name} className={styles.reviewRejectedCandidate}>
                <strong>{candidate.name}</strong>
                <ul>
                  {candidate.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p>No rejected candidate reason is available yet.</p>
          )}
        </article>
      </section>

      <Owner3dDeviceQaPanel deviceQa={review.deviceQa} />

      <section className={styles.reviewActionsPanel} aria-label="Visual review actions">
        <fieldset>
          <legend>Approval CTA</legend>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Reviewer name</span>
            <input
              className={styles.input}
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              placeholder="Owner name"
            />
          </label>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!review.approval.canApprove || submitting}
            onClick={() => void submitReview("approve")}
          >
            Approve visual
          </button>
          {!review.approval.canApprove ? (
            <p className={styles.cellSub}>{review.approval.disabledReason}</p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend>Reject CTA</legend>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Required note</span>
            <textarea
              className={styles.textarea}
              value={rejectNote}
              required
              minLength={8}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Explain what changed visually and what must be retouched."
            />
          </label>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={submitting || rejectNote.trim().length < 8}
            onClick={() => void submitReview("reject")}
          >
            Reject visual
          </button>
        </fieldset>

        <fieldset>
          <legend>Next requests</legend>
          <div className={styles.reviewRequestGrid}>
            <button type="button" className={styles.btn} disabled>
              Request artist retouch
            </button>
            {["conservative", "balanced", "aggressive"].map((modeName) => (
              <button key={modeName} type="button" className={styles.btn} disabled>
                Request re-run {modeName}
              </button>
            ))}
          </div>
          <p className={styles.cellSub}>
            These requests stay disabled until the external runner workflow records jobs.
          </p>
        </fieldset>

        <p className={styles.qrStatusLine} role="status" aria-live="polite">
          {statusMessage}
        </p>
      </section>
    </section>
  );
}
