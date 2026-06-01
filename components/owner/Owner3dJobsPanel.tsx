"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";
import {
  buildPipelineJobReport,
  buildPipelineObservabilityDashboard,
  renderPipelineJobMarkdownReport,
  type PipelineJob,
  type PipelineJobQueue
} from "@/lib/owner/threeDJobsModel";

type JobsPayload = {
  ok: boolean;
  configured?: boolean;
  persisted?: boolean;
  mode?: PipelineJobQueue["mode"];
  note?: string;
  jobs?: PipelineJob[];
  error?: string;
};

type JobsState =
  | { kind: "loading"; message: string; jobs: PipelineJob[] }
  | { kind: "ready"; message: string; jobs: PipelineJob[]; persisted: boolean }
  | { kind: "error"; message: string; jobs: PipelineJob[] };

export function Owner3dJobsPanel() {
  const [state, setState] = useState<JobsState>({
    kind: "loading",
    message: "Loading pipeline jobs.",
    jobs: []
  });
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        const response = await fetch("/api/owner/3d-ar/jobs", { method: "GET" });
        const payload = (await response.json()) as JobsPayload;
        if (!active) return;
        if (!response.ok || !payload.ok) {
          setState({
            kind: "error",
            message: payload.error || "Pipeline jobs unavailable.",
            jobs: []
          });
          return;
        }
        setState({
          kind: "ready",
          message: payload.note || "Pipeline jobs loaded.",
          jobs: payload.jobs ?? [],
          persisted: Boolean(payload.persisted)
        });
      } catch {
        if (!active) return;
        setState({ kind: "error", message: "Pipeline jobs unavailable.", jobs: [] });
      }
    }

    void loadJobs();
    return () => {
      active = false;
    };
  }, []);

  const restaurants = useMemo(
    () => Array.from(new Set(state.jobs.map((job) => job.restaurantSlug))).sort(),
    [state.jobs]
  );
  const statuses = useMemo(
    () => Array.from(new Set(state.jobs.map((job) => job.status))).sort(),
    [state.jobs]
  );
  const filteredJobs = useMemo(
    () =>
      state.jobs.filter(
        (job) =>
          (restaurantFilter === "all" || job.restaurantSlug === restaurantFilter) &&
          (statusFilter === "all" || job.status === statusFilter)
      ),
    [restaurantFilter, state.jobs, statusFilter]
  );
  const dashboard = useMemo(
    () => buildPipelineObservabilityDashboard(filteredJobs),
    [filteredJobs]
  );
  const selectedJob =
    filteredJobs.find((job) => job.id === selectedJobId) ?? filteredJobs[0] ?? null;

  function downloadReport(job: PipelineJob, type: "json" | "md") {
    const report = buildPipelineJobReport(job);
    const body =
      type === "json"
        ? JSON.stringify(report, null, 2)
        : renderPipelineJobMarkdownReport(report);
    const blob = new Blob([body], {
      type: type === "json" ? "application/json" : "text/markdown"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${job.id}.${type}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyCommand(job: PipelineJob) {
    await navigator.clipboard.writeText(job.manualRunnerCommand);
    setCopiedJobId(job.id);
    window.setTimeout(() => setCopiedJobId(null), 1800);
  }

  return (
    <section className={styles.pipelineJobsPanel} aria-label="3D/AR pipeline jobs">
      <div className={styles.pipelineJobsHeader}>
        <div>
          <p className={styles.sourceUploadEyebrow}>Persistent operations</p>
          <h3 className={styles.panelTitle}>Job queue</h3>
        </div>
        <span className={styles.sourceTag}>{state.message}</span>
      </div>

      <div className={styles.pipelineHealthGrid} aria-label="Pipeline health">
        <article className={styles.pipelineHealthCard}>
          <span>Pipeline health</span>
          <strong>{filteredJobs.length}</strong>
          <small>observable jobs</small>
        </article>
        <article className={styles.pipelineHealthCard}>
          <span>Average run duration</span>
          <strong>
            {dashboard.metrics.averageRunDurationMs === null
              ? "-"
              : `${Math.round(dashboard.metrics.averageRunDurationMs / 1000)}s`}
          </strong>
          <small>finished runs</small>
        </article>
        <article className={styles.pipelineHealthCard}>
          <span>Visual pass rate</span>
          <strong>{dashboard.metrics.visualPassRate}%</strong>
          <small>strict reports</small>
        </article>
        <article className={styles.pipelineHealthCard}>
          <span>Ready to publish</span>
          <strong>{dashboard.metrics.assetsReadyToPublish}</strong>
          <small>owner action pending</small>
        </article>
        <article className={styles.pipelineHealthCard}>
          <span>Device QA pending</span>
          <strong>{dashboard.metrics.deviceQaPending}</strong>
          <small>real evidence required</small>
        </article>
        <article className={styles.pipelineHealthCard}>
          <span>CDN validation pending</span>
          <strong>{dashboard.metrics.cdnValidationPending}</strong>
          <small>hash/header proof</small>
        </article>
      </div>

      <div className={styles.pipelineFilterBar}>
        <label className={styles.pipelineSelectField}>
          <span>Filter by restaurant</span>
          <select
            value={restaurantFilter}
            onChange={(event) => setRestaurantFilter(event.target.value)}
          >
            <option value="all">All restaurants</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant} value={restaurant}>
                {restaurant}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.pipelineSelectField}>
          <span>Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.pipelineJobsGrid}>
        <div className={styles.pipelineJobsList}>
          {filteredJobs.length === 0 ? (
            <p className={styles.emptyState}>Aucun job 3D/AR en file.</p>
          ) : (
            filteredJobs.map((job) => (
              <button
                type="button"
                key={job.id}
                data-testid={`owner-3d-job-card-${job.id}`}
                className={styles.pipelineJobCard}
                onClick={() => setSelectedJobId(job.id)}
                aria-pressed={selectedJob?.id === job.id}
              >
                <div>
                  <p className={styles.moduleCardTitle}>{job.step}</p>
                  <p className={styles.cellSub}>
                    {job.restaurantSlug} / {job.menuSlug} / {job.dishSlug} / {job.version}
                  </p>
                </div>
                <span className={styles.badge}>{job.status}</span>
                <p className={styles.cellSub}>
                  Quality: {job.observability.qualityStatus} / Duration:{" "}
                  {job.observability.metrics.durationMs === null
                    ? "not recorded"
                    : `${Math.round(job.observability.metrics.durationMs / 1000)}s`}
                </p>
                <p className={styles.pipelineNextAction}>Next action: {job.nextAction}</p>
              </button>
            ))
          )}
        </div>

        <aside className={styles.pipelineJobDetail}>
          <div className={styles.pipelineSectionTitleRow}>
            <h4 className={styles.drawerSectionTitle}>Status timeline</h4>
            <span className={styles.sourceTag}>No request-side runner</span>
          </div>
          <ol className={styles.pipelineTimeline} aria-label="Job duration timeline">
            {(selectedJob?.stepLogs.length
              ? selectedJob.stepLogs
              : selectedJob
                ? [
                    {
                      id: "current",
                      step: selectedJob.step,
                      status: selectedJob.status,
                      durationMs: selectedJob.observability.metrics.durationMs
                    }
                  ]
                : []
            ).map((step, index) => (
              <li key={`${step.id}-${index}`}>
                <strong>{step.step}</strong>
                <span>
                  {step.status} /{" "}
                  {step.durationMs === null || step.durationMs === undefined
                    ? "duration not recorded"
                    : `${Math.round(step.durationMs / 1000)}s`}
                </span>
              </li>
            ))}
          </ol>

          <details className={styles.pipelineLogsDrawer}>
            <summary>Logs</summary>
            <pre>{selectedJob ? selectedJob.logs.join("\n") : "No job selected."}</pre>
          </details>

          <div className={styles.pipelineFailureList}>
            <h4 className={styles.drawerSectionTitle}>Failure reasons</h4>
            {selectedJob?.observability.errors.length ? (
              selectedJob.observability.errors.map((error, index) => (
                <p key={`${error.step}-${index}`} className={styles.cellSub}>
                  {error.step ?? selectedJob.step}: {error.message}
                </p>
              ))
            ) : (
              <p className={styles.cellSub}>No failure reason recorded.</p>
            )}
          </div>

          <div className={styles.pipelineArtifactList}>
            <h4 className={styles.drawerSectionTitle}>Artifact refs</h4>
            {selectedJob?.observability.artifactRefs.length ? (
              selectedJob.observability.artifactRefs.map((artifact) => (
                <p key={artifact.id} className={styles.cellSub}>
                  {artifact.label}: {artifact.path}
                </p>
              ))
            ) : (
              <p className={styles.cellSub}>No artifact refs recorded.</p>
            )}
          </div>

          <div className={styles.pipelineJobActions}>
            <button type="button" className={styles.btn} disabled>
              Retry failed step
            </button>
            <button type="button" className={styles.btn} disabled>
              Cancel pending job
            </button>
            <p className={styles.cellSub}>
              Next action stays informational until a runner writes persisted state.
            </p>
            {selectedJob ? (
              <>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => downloadReport(selectedJob, "json")}
                >
                  Download JSON
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => downloadReport(selectedJob, "md")}
                >
                  Download MD
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => void copyCommand(selectedJob)}
                >
                  {copiedJobId === selectedJob.id ? "Command copied" : "Copy command"}
                </button>
              </>
            ) : null}
          </div>

          {selectedJob ? (
            <code className={styles.pipelineCommand}>{selectedJob.manualRunnerCommand}</code>
          ) : null}
        </aside>
      </div>

      <div className={styles.pipelineObservabilityGrid}>
        <section className={styles.pipelineBlockerList} aria-label="Top blockers">
          <h4 className={styles.drawerSectionTitle}>Top blockers</h4>
          {dashboard.topBlockers.length ? (
            dashboard.topBlockers.map((blocker) => (
              <p key={blocker.id} className={styles.cellSub}>
                {blocker.label} ({blocker.count})
              </p>
            ))
          ) : (
            <p className={styles.cellSub}>No blocker in the filtered queue.</p>
          )}
        </section>

        <section className={styles.pipelineRecommendationList} aria-label="Owner AI recommendations">
          <h4 className={styles.drawerSectionTitle}>Owner AI recommendations</h4>
          {dashboard.aiRecommendations.map((recommendation) => (
            <article key={recommendation.id}>
              <span className={styles.sourceTag}>{recommendation.priority}</span>
              <p className={styles.moduleCardTitle}>{recommendation.title}</p>
              <p className={styles.cellSub}>{recommendation.message}</p>
              <p className={styles.pipelineNextAction}>{recommendation.action}</p>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
