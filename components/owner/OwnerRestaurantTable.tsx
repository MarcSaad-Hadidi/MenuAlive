"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MenuQrCode } from "@/components/owner/MenuQrCode";
import styles from "@/components/owner/OwnerCockpit.module.css";
import type { OwnerRestaurant, OwnerRestaurantStatus } from "@/lib/owner/types";

type OwnerRestaurantTableProps = {
  restaurants: OwnerRestaurant[];
};

const statusLabels: Array<{ value: "all" | OwnerRestaurantStatus; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "setup_needed", label: "Setup" },
  { value: "demo", label: "Demo" },
  { value: "paused", label: "Pause" },
  { value: "archived", label: "Archive" }
];

export function OwnerRestaurantTable({ restaurants }: OwnerRestaurantTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | OwnerRestaurantStatus>("all");
  const [readiness, setReadiness] = useState<"all" | "ready" | "needs_setup">(
    "all"
  );
  const [qr, setQr] = useState<"all" | "ready" | "generable">("all");
  const [menu, setMenu] = useState<"all" | "ready" | "missing">("all");
  const [photos, setPhotos] = useState<"all" | "complete" | "missing">("all");
  const [immersive, setImmersive] = useState<"all" | "available" | "missing">(
    "all"
  );
  const [copiedId, setCopiedId] = useState("");

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesQuery =
        !normalizedQuery ||
        [restaurant.name, restaurant.slug, restaurant.location, restaurant.cuisineType]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = status === "all" || restaurant.status === status;
      const matchesReadiness =
        readiness === "all" ||
        (readiness === "ready"
          ? restaurant.readinessScore >= 80
          : restaurant.readinessScore < 80);
      const matchesQr = qr === "all" || restaurant.qrStatus === qr;
      const matchesMenu =
        menu === "all" ||
        (menu === "ready" ? restaurant.dishCount > 0 : restaurant.dishCount === 0);
      const matchesPhotos =
        photos === "all" ||
        (photos === "complete"
          ? restaurant.dishCount > 0 &&
            restaurant.photoDishCount >= restaurant.dishCount
          : restaurant.photoDishCount < restaurant.dishCount);
      const matchesImmersive =
        immersive === "all" ||
        (immersive === "available"
          ? restaurant.immersiveDishCount > 0
          : restaurant.immersiveDishCount === 0);

      return (
        matchesQuery &&
        matchesStatus &&
        matchesReadiness &&
        matchesQr &&
        matchesMenu &&
        matchesPhotos &&
        matchesImmersive
      );
    });
  }, [immersive, menu, photos, query, qr, readiness, restaurants, status]);

  async function copyMenuLink(restaurant: OwnerRestaurant) {
    try {
      await navigator.clipboard.writeText(restaurant.menuUrl);
      setCopiedId(restaurant.id);
    } catch {
      setCopiedId("");
    }
  }

  return (
    <div className={styles.restaurantTable}>
      <div className={styles.filters}>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Recherche</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, slug, cuisine"
            className={styles.control}
          />
        </label>
        <SelectFilter
          label="Statut"
          value={status}
          onChange={(value) => setStatus(value as "all" | OwnerRestaurantStatus)}
          options={statusLabels}
        />
        <SelectFilter
          label="Readiness"
          value={readiness}
          onChange={(value) => setReadiness(value as typeof readiness)}
          options={[
            { value: "all", label: "Toutes" },
            { value: "ready", label: "Prêtes" },
            { value: "needs_setup", label: "À traiter" }
          ]}
        />
        <SelectFilter
          label="QR"
          value={qr}
          onChange={(value) => setQr(value as typeof qr)}
          options={[
            { value: "all", label: "Tous" },
            { value: "ready", label: "Prêt" },
            { value: "generable", label: "Générable" }
          ]}
        />
        <SelectFilter
          label="Menu"
          value={menu}
          onChange={(value) => setMenu(value as typeof menu)}
          options={[
            { value: "all", label: "Tous" },
            { value: "ready", label: "Prêt" },
            { value: "missing", label: "Vide" }
          ]}
        />
        <SelectFilter
          label="Photos"
          value={photos}
          onChange={(value) => setPhotos(value as typeof photos)}
          options={[
            { value: "all", label: "Toutes" },
            { value: "complete", label: "Complètes" },
            { value: "missing", label: "À compléter" }
          ]}
        />
        <SelectFilter
          label="3D / AR"
          value={immersive}
          onChange={(value) => setImmersive(value as typeof immersive)}
          options={[
            { value: "all", label: "Tous" },
            { value: "available", label: "Disponible" },
            { value: "missing", label: "Manquant" }
          ]}
        />
      </div>

      <div className={styles.restaurantList}>
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((restaurant) => (
            <article key={restaurant.id} className={styles.restaurantCard}>
              <div>
                <div className={styles.restaurantHeader}>
                  <div>
                    <p className={styles.restaurantSlug}>{restaurant.slug}</p>
                    <h3 className={styles.restaurantName}>{restaurant.name}</h3>
                    <p className={styles.restaurantMeta}>
                      {restaurant.location} - {restaurant.cuisineType}
                    </p>
                  </div>
                  <div className={styles.pills}>
                    <StatusPill>{restaurant.statusLabel}</StatusPill>
                    <StatusPill>{restaurant.qrStatusLabel}</StatusPill>
                    <StatusPill>{restaurant.readinessScore}% prêt</StatusPill>
                  </div>
                </div>

                <div className={styles.miniGrid}>
                  <MiniMetric label="Plats" value={restaurant.dishCount} />
                  <MiniMetric label="Photos" value={restaurant.photoDishCount} />
                  <MiniMetric label="3D / AR" value={restaurant.immersiveDishCount} />
                  <MiniMetric label="À traiter" value={restaurant.incompleteDishCount} />
                </div>

                <div className={styles.readinessGrid}>
                  {restaurant.readinessItems.map((item) => (
                    <div key={item.id} className={styles.readinessItem}>
                      <div className={styles.readinessHeader}>
                        <strong>{item.label}</strong>
                        <span className={styles.mutedLabel}>{item.status}</span>
                      </div>
                      <p className={styles.readinessDetail}>{item.detail}</p>
                    </div>
                  ))}
                </div>

                <p className={styles.nextAction}>
                  Prochaine action : {restaurant.nextAction}
                </p>
                <p className={styles.lastActivity}>
                  Dernière activité : {restaurant.lastActivity}
                </p>

                <div className={styles.actionButtons}>
                  <a className={styles.buttonPrimary} href={restaurant.clientMenuHref}>
                    Ouvrir menu
                  </a>
                  <a className={styles.buttonSecondary} href={restaurant.dashboardHref}>
                    Voir dashboard
                  </a>
                  <button
                    type="button"
                    onClick={() => copyMenuLink(restaurant)}
                    className={styles.buttonGhost}
                  >
                    {copiedId === restaurant.id ? "Lien copié" : "Copier lien"}
                  </button>
                </div>
              </div>

              <MenuQrCode
                menuUrl={restaurant.qrTargetUrl}
                restaurantName={restaurant.name}
              />
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            Aucun restaurant ne correspond aux filtres actifs.
          </div>
        )}
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className={styles.filterField}>
      <span className={styles.filterLabel}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.control}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className={styles.statusPill}>{children}</span>;
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.miniMetric}>
      <p className={styles.metricLabel}>{label}</p>
      <strong>{new Intl.NumberFormat("fr-CA").format(value)}</strong>
    </div>
  );
}
