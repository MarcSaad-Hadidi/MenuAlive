"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MenuQrCode } from "@/components/owner/MenuQrCode";
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
    <div className="rounded-2xl border border-white/10 bg-[#090705]/88 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.26)] sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(6,minmax(130px,0.4fr))]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8f806e]">
            Recherche
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, slug, cuisine"
            className="h-11 w-full rounded-[6px] border border-white/14 bg-black/34 px-3 text-sm text-cream outline-none transition placeholder:text-white/30 focus:border-champagne focus:ring-2 focus:ring-champagne/25"
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
            { value: "ready", label: "Pretes" },
            { value: "needs_setup", label: "A traiter" }
          ]}
        />
        <SelectFilter
          label="QR"
          value={qr}
          onChange={(value) => setQr(value as typeof qr)}
          options={[
            { value: "all", label: "Tous" },
            { value: "ready", label: "Pret" },
            { value: "generable", label: "Generable" }
          ]}
        />
        <SelectFilter
          label="Menu"
          value={menu}
          onChange={(value) => setMenu(value as typeof menu)}
          options={[
            { value: "all", label: "Tous" },
            { value: "ready", label: "Pret" },
            { value: "missing", label: "Vide" }
          ]}
        />
        <SelectFilter
          label="Photos"
          value={photos}
          onChange={(value) => setPhotos(value as typeof photos)}
          options={[
            { value: "all", label: "Toutes" },
            { value: "complete", label: "Completes" },
            { value: "missing", label: "A completer" }
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

      <div className="mt-5 space-y-4">
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((restaurant) => (
          <article
            key={restaurant.id}
            className="grid gap-5 rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_260px]"
          >
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne/75">
                    {restaurant.slug}
                  </p>
                  <h3 className="mt-2 font-display text-2xl leading-tight text-cream">
                    {restaurant.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#a99a86]">
                    {restaurant.location} - {restaurant.cuisineType}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill>{restaurant.statusLabel}</StatusPill>
                  <StatusPill>{restaurant.qrStatusLabel}</StatusPill>
                  <StatusPill>{restaurant.readinessScore}% pret</StatusPill>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniMetric label="Plats" value={restaurant.dishCount} />
                <MiniMetric label="Photos" value={restaurant.photoDishCount} />
                <MiniMetric label="3D / AR" value={restaurant.immersiveDishCount} />
                <MiniMetric label="A traiter" value={restaurant.incompleteDishCount} />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {restaurant.readinessItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.025] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#e6d7bf]">
                        {item.label}
                      </p>
                      <span className="text-[11px] uppercase tracking-[0.12em] text-[#9f907d]">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#9f907d]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#d9c59f]">
                Prochaine action : {restaurant.nextAction}
              </p>
              <p className="mt-2 text-xs text-[#7f705f]">
                Derniere activite : {restaurant.lastActivity}
              </p>

              <div className="mt-5 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:flex-wrap">
                <a
                  href={restaurant.clientMenuHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-champagne/40 bg-champagne/[0.1] px-4 text-sm font-semibold text-cream transition hover:border-champagne/55 hover:bg-champagne/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  Ouvrir menu
                </a>
                <a
                  href={restaurant.dashboardHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold text-[#d9ccb8] transition hover:border-champagne/35 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  Voir dashboard
                </a>
                <button
                  type="button"
                  onClick={() => copyMenuLink(restaurant)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-[#a99a86] transition hover:border-white/18 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  {copiedId === restaurant.id ? "Lien copie" : "Copier lien"}
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
          <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm leading-relaxed text-[#a99a86]">
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
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8f806e]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[6px] border border-white/14 bg-black/34 px-3 text-sm text-cream outline-none transition focus:border-champagne focus:ring-2 focus:ring-champagne/25"
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
  return (
    <span className="inline-flex min-h-8 items-center rounded-full border border-white/12 bg-white/[0.035] px-3 text-xs font-semibold text-[#d9ccb8]">
      {children}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#7f705f]">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-cream">
        {new Intl.NumberFormat("fr-CA").format(value)}
      </p>
    </div>
  );
}
