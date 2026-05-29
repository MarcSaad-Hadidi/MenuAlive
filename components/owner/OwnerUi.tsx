import type { ReactNode } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-CA").format(value);
}

export function ModuleHeader({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.moduleHeader}>
      <div>
        <h2 className={styles.moduleTitle}>{title}</h2>
        <p className={styles.moduleSub}>{description}</p>
      </div>
      {actions ? <div className={styles.moduleActions}>{actions}</div> : null}
    </header>
  );
}

export function StatGroup({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.statGroup}>
      <h3 className={styles.statGroupTitle}>{title}</h3>
      <div className={styles.statRow}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  primary = false
}: {
  label: string;
  value: number | string;
  hint?: string;
  primary?: boolean;
}) {
  return (
    <article
      className={`${styles.statTile} ${primary ? styles.statTilePrimary : ""}`}
    >
      <p className={styles.statTileLabel}>{label}</p>
      <p className={styles.statTileValue}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {hint ? <p className={styles.statTileHint}>{hint}</p> : null}
    </article>
  );
}

export type BadgeTone = "ready" | "warn" | "danger" | "muted";

const BADGE_CLASS: Record<BadgeTone, string> = {
  ready: styles.badgeReady,
  warn: styles.badgeWarn,
  danger: styles.badgeDanger,
  muted: ""
};

export function Badge({
  tone = "muted",
  children
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return <span className={`${styles.badge} ${BADGE_CLASS[tone]}`}>{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className={styles.emptyState}>{children}</div>;
}

export function Panel({
  title,
  action,
  children
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>{title}</h3>
        {action ? <div className={styles.moduleActions}>{action}</div> : null}
      </div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
