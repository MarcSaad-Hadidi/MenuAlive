"use client";

import { useState } from "react";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { OwnerQrCustomizer } from "@/components/owner/OwnerQrCustomizer";
import type { OwnerRestaurant } from "@/lib/owner/types";

type OwnerQrManagerProps = {
  restaurants: OwnerRestaurant[];
};

export function OwnerQrManager({ restaurants }: OwnerQrManagerProps) {
  const [selectedId, setSelectedId] = useState(restaurants[0]?.id ?? "");
  const selected =
    restaurants.find((restaurant) => restaurant.id === selectedId) ?? restaurants[0];

  if (!selected) {
    return (
      <div className={styles.emptyState}>
        Aucun restaurant disponible. Créez un restaurant pour générer son QR.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label className={styles.field} style={{ maxWidth: 360 }}>
        <span className={styles.fieldLabel}>Restaurant</span>
        <select
          className={styles.select}
          value={selected.id}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name} · {restaurant.qrStatusLabel}
            </option>
          ))}
        </select>
      </label>

      <OwnerQrCustomizer
        key={selected.id}
        restaurantId={selected.id}
        restaurantName={selected.name}
        restaurantSlug={selected.slug}
        publicMenuUrl={selected.publicMenuUrl}
        targetPath={selected.publicMenuPath}
      />
    </div>
  );
}
