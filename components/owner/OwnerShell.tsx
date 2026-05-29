"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { OWNER_NAV_ITEMS, ownerNavTitle } from "@/lib/owner/nav";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/owner";
  const [mobileOpen, setMobileOpen] = useState(false);
  const { label, hint } = ownerNavTitle(pathname);

  function isActive(href: string) {
    if (href === "/owner") return pathname === "/owner";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className={styles.console}>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          className={styles.sidebarBackdrop}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarMobileOpen : ""}`}
        aria-label="Navigation Vistaire Owner"
      >
        <Link className={styles.sidebarBrand} href="/owner" prefetch={false}>
          <span className={styles.sidebarBrandName}>Vistaire</span>
          <span className={styles.sidebarBrandMeta}>Owner Command Center</span>
        </Link>
        <nav className={styles.sidebarNav}>
          {OWNER_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`${styles.navItem} ${
                isActive(item.href) ? styles.navItemActive : ""
              }`}
            >
              <span className={styles.navItemLabel}>{item.label}</span>
              <span className={styles.navItemHint}>{item.hint}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          Cockpit interne · accès owner-only
        </div>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            ☰
          </button>
          <div className={styles.topbarTitleWrap}>
            <h1 className={styles.topbarTitle}>{label}</h1>
            <p className={styles.topbarSub}>{hint}</p>
          </div>
          <div className={styles.topbarActions}>
            <Link className={styles.btn} href="/apercu-restaurateur" prefetch={false}>
              Aperçu public
            </Link>
            <UserButton />
          </div>
        </header>
        <main className={styles.consoleContent}>{children}</main>
      </div>
    </div>
  );
}
