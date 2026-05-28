import Image from "next/image";
import Link from "next/link";
import restaurantBackground from "@/Framer/PhotoRestoComplet5.png";
import { OwnerRestaurantTable } from "@/components/owner/OwnerRestaurantTable";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { RestaurantCreateForm } from "@/components/owner/RestaurantCreateForm";
import { getOwnerDashboardData } from "@/lib/owner/data";
import { getSiteUrl } from "@/lib/seo";
import type { OwnerAction, OwnerRecommendation } from "@/lib/owner/types";

export const dynamic = "force-dynamic";

const RECOMMENDATION_STYLES: Record<OwnerRecommendation["type"], string> = {
  opportunity: styles.recommendationOpportunity,
  watch: styles.recommendationWatch,
  setup: styles.recommendationSetup,
  upsell: styles.recommendationUpsell
};

const ACTION_STYLES: Record<OwnerAction["priority"], string> = {
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-CA").format(value);
}

export default async function OwnerPage() {
  const data = await getOwnerDashboardData();
  const siteOrigin = getSiteUrl().origin;

  return (
    <main className={styles.page}>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.backgroundImage}
        fill
        priority
        quality={100}
        sizes="100vw"
        src={restaurantBackground}
        unoptimized
      />

      <div className={styles.shell}>
        <div className={styles.frame}>
          <section className={`${styles.card} ${styles.heroPanel}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Cockpit owner Vistaire</p>
              <h1>Pilotage restaurant, menu et QR.</h1>
              <p className={styles.heroLead}>
                Vue interne owner-only pour savoir quels restaurants sont
                montrables, lesquels demandent une action, et quels QR pointent
                vers un menu public exploitable.
              </p>
              <div className={styles.heroActions}>
                <Link
                  className={styles.buttonPrimary}
                  href="#create-restaurant"
                  prefetch={false}
                >
                  Créer restaurant
                </Link>
                <Link
                  className={styles.buttonSecondary}
                  href="/apercu-restaurateur"
                  prefetch={false}
                >
                  Page publique
                </Link>
                <Link
                  className={styles.buttonGhost}
                  href="#restaurants"
                  prefetch={false}
                >
                  Voir restaurants
                </Link>
              </div>
            </div>

            <aside className={`${styles.card} ${styles.sourcePanel}`}>
              <div>
                <p className={styles.badge}>Source cockpit</p>
                <p className={styles.bodyText}>{data.note}</p>
              </div>
              <p className={styles.sourceBadge}>
                {data.source === "fallback" ? "Données demo" : "Données Supabase"}
              </p>
            </aside>
          </section>

          <section className={`${styles.card} ${styles.section}`} aria-labelledby="owner-stats-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="owner-stats-heading" className={styles.sectionTitle}>
                  Vue globale
                </h2>
                <p className={styles.sectionText}>
                  Les chiffres de setup restent dérivés des données disponibles.
                </p>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <StatCard label="Restaurants total" value={data.stats.totalRestaurants} />
              <StatCard label="Actifs" value={data.stats.activeRestaurants} />
              <StatCard label="En setup" value={data.stats.setupNeededRestaurants} />
              <StatCard label="Menus prêts" value={data.stats.menuReadyRestaurants} />
              <StatCard label="QR prêts" value={data.stats.qrReadyRestaurants} />
              <StatCard label="Plats total" value={data.stats.totalDishes} />
              <StatCard label="Plats avec photos" value={data.stats.dishesWithPhotos} />
              <StatCard label="Plats avec 3D / AR" value={data.stats.dishesWithImmersive} />
              <StatCard label="Actions à traiter" value={data.stats.actionsToTreat} />
              <StatCard label="Ouvertures menu" value={data.stats.menuOpensToday} />
              <StatCard label="Plats consultés" value={data.stats.dishViewsToday} />
              <article className={styles.statCard}>
                <p className={styles.metricLabel}>Restaurant le plus actif</p>
                <strong>{data.stats.mostActiveRestaurant}</strong>
              </article>
            </div>
          </section>

          <section className={`${styles.card} ${styles.section}`} aria-labelledby="owner-actions-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="owner-actions-heading" className={styles.sectionTitle}>
                  Priorités owner
                </h2>
                <p className={styles.sectionText}>
                  Actions dérivées des menus, QR, photos et assets immersifs.
                </p>
              </div>
            </div>
            <div className={styles.actionGrid}>
              {data.actions.length > 0 ? (
                data.actions.map((action) => (
                  <ActionCard key={action.id} action={action} />
                ))
              ) : (
                <article className={styles.empty}>
                  Aucun signal urgent dans les données disponibles.
                </article>
              )}
            </div>
          </section>

          <section id="restaurants" className={`${styles.card} ${styles.section}`} aria-labelledby="owner-restaurants-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="owner-restaurants-heading" className={styles.sectionTitle}>
                  Restaurants
                </h2>
                <p className={styles.sectionText}>
                  Recherche, filtres, readiness, liens menu et QR générables par
                  restaurant.
                </p>
              </div>
            </div>
            <OwnerRestaurantTable restaurants={data.restaurants} />
          </section>

          <section className={`${styles.card} ${styles.section}`} aria-labelledby="owner-recommendations-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="owner-recommendations-heading" className={styles.sectionTitle}>
                  Recommandations automatiques
                </h2>
                <p className={styles.sectionText}>
                  Priorités proposées à partir des signaux agrégés des restaurants.
                </p>
              </div>
            </div>
            <div className={styles.recommendationGrid}>
              {data.recommendations.map((recommendation) => (
                <article key={recommendation.id} className={styles.recommendationCard}>
                  <span
                    className={`${styles.pill} ${RECOMMENDATION_STYLES[recommendation.type]}`}
                  >
                    {recommendation.restaurantName || "Vistaire"}
                  </span>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.body}</p>
                </article>
              ))}
            </div>
            <p className={styles.sourceNote}>
              Source : recommandations automatiques
              {data.recommendationSource === "rules"
                ? " avec logique de secours."
                : "."}
            </p>
          </section>

          <section
            id="create-restaurant"
            className={`${styles.card} ${styles.section}`}
            aria-labelledby="create-restaurant-heading"
          >
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="create-restaurant-heading" className={styles.sectionTitle}>
                  Créer un restaurant
                </h2>
                <p className={styles.sectionText}>
                  Création owner-only avec slug, URL menu preview et QR relié au
                  menu public.
                </p>
              </div>
            </div>
            <RestaurantCreateForm siteOrigin={siteOrigin} />
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className={styles.statCard}>
      <p className={styles.metricLabel}>{label}</p>
      <strong>{formatNumber(value)}</strong>
    </article>
  );
}

function ActionCard({ action }: { action: OwnerAction }) {
  return (
    <Link href={action.href} className={styles.actionCard} prefetch={false}>
      <span className={`${styles.pill} ${ACTION_STYLES[action.priority]}`}>
        {action.restaurantName}
      </span>
      <h3>{action.title}</h3>
      <p>{action.body}</p>
    </Link>
  );
}
