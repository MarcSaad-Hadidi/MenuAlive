"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/components/owner/OwnerCockpit.module.css";
import type {
  OwnerAiPriority,
  OwnerAiResult,
  OwnerRecommendation
} from "@/lib/owner/types";

type OwnerAiPanelProps = {
  initialPriorities: OwnerAiPriority[];
  recommendations: OwnerRecommendation[];
  note: string;
};

const PRIORITY_CLASS: Record<OwnerAiPriority["priority"], string> = {
  high: styles.aiPriorityHigh,
  medium: styles.aiPriorityMedium,
  low: styles.aiPriorityLow
};

export function OwnerAiPanel({
  initialPriorities,
  recommendations,
  note
}: OwnerAiPanelProps) {
  const [priorities, setPriorities] = useState(initialPriorities);
  const [recs, setRecs] = useState(recommendations);
  const [currentNote, setCurrentNote] = useState(note);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/owner/ai", { method: "POST" });
      const payload = (await response.json()) as {
        ok: boolean;
        result?: OwnerAiResult;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.result) {
        setError(payload.error || "Copilote indisponible.");
        return;
      }
      setPriorities(payload.result.priorities);
      setRecs(payload.result.recommendations);
      setCurrentNote(payload.result.note);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.aiPanel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Copilote owner</h3>
        <div className={styles.moduleActions}>
          <button
            type="button"
            className={styles.btn}
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Analyse…" : "Rafraîchir"}
          </button>
        </div>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.aiMeta}>{currentNote}</p>
        {error ? <p className={styles.qrWarning}>{error}</p> : null}

        {priorities.length === 0 ? (
          <div className={styles.emptyState}>
            Aucune priorité détectée dans les données disponibles. Le copilote
            propose uniquement — vous gardez le contrôle des décisions.
          </div>
        ) : (
          <div className={styles.aiList}>
            {priorities.map((item) => (
              <article key={item.id} className={styles.aiItem}>
                <span
                  className={`${styles.aiPriority} ${PRIORITY_CLASS[item.priority]}`}
                  aria-hidden="true"
                />
                <div className={styles.aiItemBody}>
                  <p className={styles.aiItemTitle}>{item.title}</p>
                  <p className={styles.aiItemText}>{item.body}</p>
                  <Link className={styles.inlineLink} href={item.href} prefetch={false}>
                    {item.action}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {recs.length > 0 ? (
          <>
            <p className={styles.statGroupTitle} style={{ marginTop: 18 }}>
              Recommandations
            </p>
            <div className={styles.aiList}>
              {recs.map((rec) => (
                <article key={rec.id} className={styles.aiItem}>
                  <span className={styles.aiPriority} aria-hidden="true" />
                  <div className={styles.aiItemBody}>
                    <p className={styles.aiItemTitle}>{rec.title}</p>
                    <p className={styles.aiItemText}>{rec.body}</p>
                    {rec.restaurantName ? (
                      <span className={styles.aiMeta}>{rec.restaurantName}</span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
