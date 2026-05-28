import Link from "next/link";
import { OwnerRestaurantTable } from "@/components/owner/OwnerRestaurantTable";
import { RestaurantCreateForm } from "@/components/owner/RestaurantCreateForm";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getOwnerDashboardData } from "@/lib/owner/data";
import { getSiteUrl } from "@/lib/seo";
import type { OwnerAction, OwnerRecommendation } from "@/lib/owner/types";

export const dynamic = "force-dynamic";

const RECOMMENDATION_STYLES: Record<OwnerRecommendation["type"], string> = {
  opportunity: "border-champagne/35 bg-champagne/10 text-champagne",
  watch: "border-[#c9a46f]/28 bg-[#c9a46f]/8 text-[#e3c99b]",
  setup: "border-white/12 bg-white/[0.04] text-[#d9ccb8]",
  upsell: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
};

const ACTION_STYLES: Record<OwnerAction["priority"], string> = {
  high: "border-[#e8b9a4]/35 bg-[#e8b9a4]/10 text-[#ffd7c5]",
  medium: "border-champagne/35 bg-champagne/10 text-champagne",
  low: "border-white/12 bg-white/[0.04] text-[#d9ccb8]"
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-CA").format(value);
}

export default async function OwnerPage() {
  const data = await getOwnerDashboardData();
  const siteOrigin = getSiteUrl().origin;

  return (
    <div className="bg-[#080706] px-4 pb-24 pt-28 text-cream sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#090705]/92 px-5 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:px-8 sm:py-10 lg:px-10">
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne/80">
                Cockpit owner Vistaire
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.3rem,6vw,5.2rem)] font-normal leading-[0.98] text-cream">
                Pilotage restaurant, menu et QR.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#cdbfa9] sm:text-lg">
                Vue interne owner-only pour savoir quels restaurants sont
                montrables, lesquels demandent une action, et quels QR pointent
                vers un menu public exploitable.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f806e]">
                Source cockpit
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#d9ccb8]">
                {data.note}
              </p>
              <div className="mt-5 grid gap-2 min-[430px]:grid-cols-2 lg:grid-cols-1">
                <PrimaryButton href="#create-restaurant" className="justify-center">
                  Creer restaurant
                </PrimaryButton>
                <Link
                  href="/apercu-restaurateur"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 px-5 text-center text-sm font-semibold text-[#d9ccb8] transition hover:border-champagne/35 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  Page publique
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="owner-stats-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="owner-stats-heading" className="font-display text-2xl text-cream">
                Vue globale
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
                Les chiffres de setup restent derives des donnees disponibles.
              </p>
            </div>
            <p className="text-sm text-[#8f806e]">
              {data.source === "fallback" ? "Donnees demo" : "Donnees Supabase"}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Restaurants total" value={data.stats.totalRestaurants} />
            <StatCard label="Actifs" value={data.stats.activeRestaurants} />
            <StatCard label="En setup" value={data.stats.setupNeededRestaurants} />
            <StatCard label="Menus prets" value={data.stats.menuReadyRestaurants} />
            <StatCard label="QR marques prets" value={data.stats.qrReadyRestaurants} />
            <StatCard label="Plats total" value={data.stats.totalDishes} />
            <StatCard label="Plats avec photos" value={data.stats.dishesWithPhotos} />
            <StatCard label="Plats avec 3D / AR" value={data.stats.dishesWithImmersive} />
            <StatCard label="Actions a traiter" value={data.stats.actionsToTreat} />
            <StatCard label="Ouvertures menu" value={data.stats.menuOpensToday} />
            <StatCard label="Plats consultes" value={data.stats.dishViewsToday} />
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

        <section className="mt-12" aria-labelledby="owner-actions-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="owner-actions-heading" className="font-display text-2xl text-cream">
                Priorites owner
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
                Actions derivees des menus, QR, photos et assets immersifs.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.actions.length > 0 ? (
              data.actions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))
            ) : (
              <article className="rounded-xl border border-white/10 bg-[#090705]/88 p-5 text-sm leading-relaxed text-[#a99a86]">
                Aucun signal urgent dans les donnees disponibles.
              </article>
            )}
          </div>
        </section>

        <section id="restaurants" className="mt-12" aria-labelledby="owner-restaurants-heading">
          <div className="mb-6">
            <h2 id="owner-restaurants-heading" className="font-display text-2xl text-cream">
              Restaurants
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
              Recherche, filtres, readiness, liens menu et QR generables par
              restaurant.
            </p>
          </div>
          <OwnerRestaurantTable restaurants={data.restaurants} />
        </section>

        <section className="mt-12" aria-labelledby="owner-recommendations-heading">
          <div>
            <h2 id="owner-recommendations-heading" className="font-display text-2xl text-cream">
              Recommandations automatiques
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
              Priorites proposees a partir des signaux agreges des restaurants.
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
            <h2 id="create-restaurant-heading" className="font-display text-2xl text-cream">
              Creer un restaurant
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
              Creation owner-only avec slug, URL menu preview et QR relie au
              menu public.
            </p>
          </div>
          <RestaurantCreateForm siteOrigin={siteOrigin} />
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

function ActionCard({ action }: { action: OwnerAction }) {
  return (
    <Link
      href={action.href}
      className="rounded-xl border border-white/10 bg-[#090705]/88 p-5 shadow-[0_16px_52px_rgba(0,0,0,0.24)] transition hover:border-champagne/28 hover:bg-white/[0.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
    >
      <span
        className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold ${ACTION_STYLES[action.priority]}`}
      >
        {action.restaurantName}
      </span>
      <h3 className="mt-4 font-display text-xl leading-snug text-cream">
        {action.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[#a99a86]">{action.body}</p>
    </Link>
  );
}
