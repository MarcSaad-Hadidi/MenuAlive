import Link from "next/link";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RestaurantCreateForm } from "@/components/owner/RestaurantCreateForm";
import { getOwnerDashboardData } from "@/lib/owner/data";
import type {
  OwnerRecommendation,
  OwnerRestaurant,
  OwnerRestaurantStatus
} from "@/lib/owner/types";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<OwnerRestaurantStatus, string> = {
  demo: "border-champagne/35 bg-champagne/10 text-champagne",
  active: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  setup_needed: "border-[#c9a46f]/28 bg-[#c9a46f]/8 text-[#e3c99b]",
  paused: "border-white/12 bg-white/[0.04] text-[#d9ccb8]",
  archived: "border-white/8 bg-black/20 text-[#8f806e]"
};

const RECOMMENDATION_STYLES: Record<OwnerRecommendation["type"], string> = {
  opportunity: "border-champagne/35 bg-champagne/10 text-champagne",
  watch: "border-[#c9a46f]/28 bg-[#c9a46f]/8 text-[#e3c99b]",
  setup: "border-white/12 bg-white/[0.04] text-[#d9ccb8]",
  upsell: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-CA").format(value);
}

export default async function OwnerPage() {
  const data = await getOwnerDashboardData();

  return (
    <div className="bg-[#080706] px-4 pb-24 pt-28 text-cream sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#090705]/92 px-5 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:px-8 sm:py-10 lg:px-10">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(217,184,121,0.14),transparent_42%)]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-[clamp(2.4rem,6vw,5.2rem)] font-normal leading-[0.98] text-cream">
                Pilotage Vistaire
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#cdbfa9] sm:text-lg">
                Suivez les restaurants, l&apos;activité des menus et les opportunités
                à traiter.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
              <PrimaryButton href="/admin" className="justify-center sm:w-auto">
                Voir dashboard démo
              </PrimaryButton>
              <Link
                href="/demo"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 px-6 text-center text-sm font-semibold text-cream transition hover:border-champagne/35 hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                Voir menu démo
              </Link>
              <Link
                href="#create-restaurant"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 px-6 text-center text-sm font-semibold text-[#cdbfa9] transition hover:border-champagne/35 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                Créer un restaurant
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="owner-stats-heading">
          <h2 id="owner-stats-heading" className="font-display text-2xl text-cream">
            Vue globale
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Restaurants total" value={data.stats.totalRestaurants} />
            <StatCard label="Restaurants actifs" value={data.stats.activeRestaurants} />
            <StatCard label="Restaurants en démo" value={data.stats.demoRestaurants} />
            <StatCard
              label="Restaurants à configurer"
              value={data.stats.setupNeededRestaurants}
            />
            <StatCard
              label="Ouvertures menus aujourd'hui"
              value={data.stats.menuOpensToday}
            />
            <StatCard
              label="Plats consultés aujourd'hui"
              value={data.stats.dishViewsToday}
            />
            <StatCard
              label="Interactions immersives aujourd'hui"
              value={data.stats.immersiveInteractionsToday}
            />
            <article className="rounded-xl border border-white/10 bg-gradient-to-br from-[#14100d]/96 via-[#0d0a08]/98 to-[#070504] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
              <p className="text-[0.68rem] font-semibold uppercase leading-relaxed tracking-[0.18em] text-champagne/80">
                Restaurant le plus actif
              </p>
              <p className="mt-4 font-display text-2xl leading-tight text-cream">
                {data.stats.mostActiveRestaurant}
              </p>
            </article>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="owner-restaurants-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="owner-restaurants-heading"
                className="font-display text-2xl text-cream"
              >
                Restaurants
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
                Statut, activité et accès rapides pour chaque client.
              </p>
            </div>
            <p className="text-sm text-[#8f806e]">{data.note}</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {data.restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="owner-recommendations-heading">
          <div>
            <h2
              id="owner-recommendations-heading"
              className="font-display text-2xl text-cream"
            >
              Recommandations automatiques
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
              Priorités proposées à partir des signaux agrégés des restaurants.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.recommendations.map((recommendation) => (
              <article
                key={recommendation.id}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-[#14100d]/96 to-[#080604] p-5 shadow-[0_16px_52px_rgba(0,0,0,0.24)]"
              >
                <span
                  className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold ${RECOMMENDATION_STYLES[recommendation.type]}`}
                >
                  {recommendation.restaurantName || "Vistaire"}
                </span>
                <h3 className="mt-4 font-display text-xl leading-snug text-cream">
                  {recommendation.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#a99a86]">
                  {recommendation.body}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#7f705f]">
            Source : recommandations automatiques
            {data.recommendationSource === "rules"
              ? " avec logique de secours."
              : "."}
          </p>
        </section>

        <section
          id="create-restaurant"
          className="mt-12 scroll-mt-28"
          aria-labelledby="create-restaurant-heading"
        >
          <div className="mb-6">
            <h2
              id="create-restaurant-heading"
              className="font-display text-2xl text-cream"
            >
              Créer un restaurant
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
              Ajoutez un restaurant pilote sans créer un gros espace de gestion.
            </p>
          </div>
          <RestaurantCreateForm />
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-white/10 bg-gradient-to-br from-[#14100d]/96 via-[#0d0a08]/98 to-[#070504] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <p className="text-[0.68rem] font-semibold uppercase leading-relaxed tracking-[0.18em] text-champagne/80">
        {label}
      </p>
      <p className="mt-4 font-display text-[2rem] leading-none text-cream sm:text-[2.35rem]">
        {formatNumber(value)}
      </p>
    </article>
  );
}

function RestaurantCard({ restaurant }: { restaurant: OwnerRestaurant }) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#090705]/88 p-5 shadow-[0_16px_52px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-2xl leading-tight text-cream">
            {restaurant.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#a99a86]">
            {restaurant.location} · {restaurant.cuisineType}
          </p>
        </div>
        <span
          className={`inline-flex min-h-8 w-fit items-center rounded-full border px-3 text-xs font-semibold ${STATUS_STYLES[restaurant.status]}`}
        >
          {restaurant.statusLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Plats" value={restaurant.dishCount} />
        <MiniMetric label="Ouvertures" value={restaurant.openingsToday} />
        <MiniMetric label="Interactions" value={restaurant.interactionsToday} />
      </div>

      <p className="mt-4 text-sm text-[#8f806e]">
        Dernière activité : {restaurant.lastActivity}
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={restaurant.clientMenuHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-champagne/40 bg-champagne/[0.1] px-5 text-sm font-semibold text-cream transition hover:border-champagne/55 hover:bg-champagne/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          Voir menu client
        </Link>
        <Link
          href={restaurant.dashboardHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 px-5 text-sm font-semibold text-[#cdbfa9] transition hover:border-champagne/35 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          Voir dashboard démo
        </Link>
        <Link
          href={`/owner?restaurant=${encodeURIComponent(restaurant.slug)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-[#8f806e] transition hover:border-white/18 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          Ouvrir
        </Link>
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l border-white/[0.12] pl-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#7f705f]">
        {label}
      </p>
      <p className="mt-2 font-display text-xl text-cream">{formatNumber(value)}</p>
    </div>
  );
}
