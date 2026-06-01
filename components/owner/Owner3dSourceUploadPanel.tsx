"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";

type SourceUploadIdentity = {
  restaurantSlug: string;
  menuSlug: string;
  dishSlug: string;
  version: string;
};

type SourceUploadRecord = SourceUploadIdentity & {
  id?: string;
  originalName: string;
  bytes: number;
  sha256: string;
  status: string;
  uploadedByEmail: string | null;
  createdAt?: string;
};

type StatusPayload = {
  ok: boolean;
  configured?: boolean;
  message?: string;
  error?: string;
  record?: SourceUploadRecord | null;
};

type UploadState =
  | { kind: "idle"; message: string }
  | { kind: "checking"; message: string }
  | { kind: "ready"; message: string }
  | { kind: "uploading"; message: string }
  | { kind: "uploaded"; message: string }
  | { kind: "error"; message: string };

const CLIENT_SIZE_WARNING_BYTES = 50 * 1024 * 1024;
const IDENTITY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSafeIdentitySegment(value: string): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    value === value.toLowerCase() &&
    !value.includes("..") &&
    IDENTITY_PATTERN.test(value)
  );
}

function validateIdentity(identity: SourceUploadIdentity): string | null {
  for (const [key, value] of Object.entries(identity)) {
    if (!isSafeIdentitySegment(value)) return `${key} invalide.`;
  }
  return null;
}

function statusUrl(identity: SourceUploadIdentity): string {
  const params = new URLSearchParams(identity);
  return `/api/owner/3d-ar/sources/status?${params.toString()}`;
}

export function Owner3dSourceUploadPanel({
  initialIdentity
}: {
  initialIdentity: SourceUploadIdentity | null;
}) {
  const [identity, setIdentity] = useState<SourceUploadIdentity>(
    initialIdentity ?? {
      restaurantSlug: "",
      menuSlug: "",
      dishSlug: "",
      version: ""
    }
  );
  const [file, setFile] = useState<File | null>(null);
  const [configured, setConfigured] = useState(false);
  const [record, setRecord] = useState<SourceUploadRecord | null>(null);
  const [state, setState] = useState<UploadState>({
    kind: "checking",
    message: "Verification du storage staging."
  });

  const identityError = useMemo(() => validateIdentity(identity), [identity]);
  const sizeWarning =
    file && file.size > CLIENT_SIZE_WARNING_BYTES
      ? `Source volumineuse (${formatBytes(file.size)}) : le serveur appliquera la limite configuree.`
      : "";
  const fileIsGlb = Boolean(file?.name.toLowerCase().endsWith(".glb"));
  const fileError =
    file && !fileIsGlb ? "Fichier refuse : extension .glb requise." : "";
  const uploadDisabled =
    state.kind === "uploading" ||
    Boolean(identityError) ||
    !configured ||
    !file ||
    !fileIsGlb;

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      setState({ kind: "checking", message: "Verification du storage staging." });
      try {
        const url = initialIdentity ? statusUrl(initialIdentity) : "/api/owner/3d-ar/sources/status";
        const response = await fetch(url, { method: "GET" });
        const payload = (await response.json()) as StatusPayload;
        if (!active) return;
        if (!response.ok || !payload.ok) {
          setConfigured(false);
          setState({
            kind: "error",
            message: payload.error || "Statut source indisponible."
          });
          return;
        }
        setConfigured(Boolean(payload.configured));
        setRecord(payload.record ?? null);
        setState({
          kind: payload.configured ? "ready" : "idle",
          message: payload.configured
            ? "Storage staging prive pret."
            : "storage not configured"
        });
      } catch {
        if (!active) return;
        setConfigured(false);
        setState({ kind: "error", message: "Statut source indisponible." });
      }
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, [initialIdentity]);

  function updateIdentity(key: keyof SourceUploadIdentity, value: string) {
    setIdentity((previous) => ({ ...previous, [key]: value }));
  }

  function onFileChange(nextFile: File | null) {
    setFile(nextFile);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".glb")) {
      setState({ kind: "error", message: "Fichier refuse : extension .glb requise." });
      return;
    }
    setState({
      kind: configured ? "ready" : "idle",
      message: configured ? "Source GLB prete a envoyer." : "storage not configured"
    });
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const identityValidation = validateIdentity(identity);
    if (identityValidation) {
      setState({ kind: "error", message: identityValidation });
      return;
    }
    if (!file) {
      setState({ kind: "error", message: "Selectionnez un fichier .glb." });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setState({ kind: "error", message: "Fichier refuse : extension .glb requise." });
      return;
    }
    if (!configured) {
      setState({ kind: "idle", message: "storage not configured" });
      return;
    }

    const formData = new FormData();
    formData.set("restaurantSlug", identity.restaurantSlug);
    formData.set("menuSlug", identity.menuSlug);
    formData.set("dishSlug", identity.dishSlug);
    formData.set("version", identity.version);
    formData.set("file", file);

    setState({ kind: "uploading", message: "Upload staging en cours." });
    try {
      const response = await fetch("/api/owner/3d-ar/sources", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as StatusPayload;
      if (!response.ok || !payload.ok || !payload.record) {
        setState({
          kind: "error",
          message: payload.error || "Upload source refuse."
        });
        return;
      }

      setRecord(payload.record);
      setState({
        kind: "uploaded",
        message: "Source uploaded : staging prive et metadata enregistres."
      });
    } catch {
      setState({ kind: "error", message: "Erreur reseau pendant l'upload source." });
    }
  }

  return (
    <section className={styles.sourceUploadPanel} aria-label="Upload source GLB">
      <div className={styles.sourceUploadHeader}>
        <div>
          <p className={styles.sourceUploadEyebrow}>Private staging</p>
          <h3 className={styles.panelTitle}>Upload source GLB</h3>
        </div>
        <span className={`${styles.badge} ${configured ? styles.badgeReady : styles.badgeWarn}`}>
          {configured ? "Storage pret" : "storage not configured"}
        </span>
      </div>

      <form className={styles.sourceUploadForm} onSubmit={submitUpload}>
        <div className={styles.sourceUploadIdentityGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Restaurant</span>
            <input
              className={styles.input}
              value={identity.restaurantSlug}
              onChange={(event) => updateIdentity("restaurantSlug", event.target.value)}
              placeholder="maison-elyse"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Menu</span>
            <input
              className={styles.input}
              value={identity.menuSlug}
              onChange={(event) => updateIdentity("menuSlug", event.target.value)}
              placeholder="main"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Dish</span>
            <input
              className={styles.input}
              value={identity.dishSlug}
              onChange={(event) => updateIdentity("dishSlug", event.target.value)}
              placeholder="homard-bisque"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Version</span>
            <input
              className={styles.input}
              value={identity.version}
              onChange={(event) => updateIdentity("version", event.target.value)}
              placeholder="v1"
              required
            />
          </label>
        </div>

        <div className={styles.sourceUploadControls}>
          <label className={styles.sourceUploadDrop}>
            <span className={styles.fieldLabel}>Source GLB</span>
            <input
              data-testid="owner-3d-source-file-input"
              type="file"
              accept=".glb,model/gltf-binary"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            />
            <span>{file ? `${file.name} · ${formatBytes(file.size)}` : "Choisir un .glb"}</span>
          </label>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={uploadDisabled}
          >
            {state.kind === "uploading" ? "Upload..." : "Upload source"}
          </button>
        </div>
      </form>

      {sizeWarning ? <p className={styles.qrWarning}>{sizeWarning}</p> : null}
      {!configured ? (
        <p className={styles.qrWarning}>
          storage not configured : navigation manifest/report seulement, aucun upload
          factice.
        </p>
      ) : null}
      <p
        className={styles.qrStatusLine}
        aria-live="polite"
        data-testid="owner-3d-source-status"
      >
        {fileError || state.message}
      </p>

      {record ? (
        <dl className={styles.sourceUploadRecord}>
          <div>
            <dt>Status</dt>
            <dd>{record.status}</dd>
          </div>
          <div>
            <dt>Original</dt>
            <dd>{record.originalName}</dd>
          </div>
          <div>
            <dt>Bytes</dt>
            <dd>{formatBytes(record.bytes)}</dd>
          </div>
          <div>
            <dt>SHA-256</dt>
            <dd>
              {record.sha256.slice(0, 8)}...{record.sha256.slice(-8)}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
