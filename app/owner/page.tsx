import Link from "next/link";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { OwnerAiPanel } from "@/components/owner/OwnerAiPanel";
import { ModuleHeader, StatGroup, StatTile } from "@/components/owner/OwnerUi";
import { getOwnerDashboard } from "@/lib/owner/dashboard";
import { buildOwnerAiPriorities } from "@/lib/owner/ai/rules";

export const dynamic = "force-dynamic";

export default async function OwnerOverviewPage() {
  const data = await getOwnerDashboard();
  const operational = data.restaurants.filter((restaurant) => !restaurant.isDemo);

  const today = {
    toComplete: operational.filter((r) => r.status === "setup_needed").length,
    qrToDo: operational.filter((r) => r.qrStatus !== "ready").length,
    photosMissing: operational.reduce((sum, r) => sum + r.incompleteDishCount, 0),
    readyToPublish: operational.filter(
      (r) =>
        r.status === "setup_needed" &&
        r.dishCount > 0 &&
        r.qrStatus === "ready" &&
        r.incompleteDishCount === 0
    ).length,
    immersiveGaps: operational.filter(
      (r) => r.dishCount > 0 && r.immersiveDishCount === 0
    ).length
  };

  const priorities = buildOwnerAiPriorities(data.restaurants);

  return (
    <>
      <ModuleHeader
        title="Vistaire Owner"
        description="Gestion restaurants, menus, QR et qualité produit."
        actions={
          <>
            <Link className={styles.btnPrimary + " " + styles.btn} href="/owner/restaurants#create" prefetch={false}>
              Créer restaurant
            </Link>
            <Link className={styles.btn} href="/owner/qr-codes" prefetch={false}>
              Générer QR
            </Link>
            <Link className={styles.btn} href="/owner/restaurants" prefetch={false}>
              Voir restaurants
            </Link>
          </>
        }
      />

      <section className={styles.todayBanner} aria-label="À traiter aujourd'hui">
        <Link className={styles.todayItem} href="/owner/restaurants" prefetch={false}>
          <span className={styles.todayCount}>{today.toComplete}</span>
          <span className={styles.todayLabel}>Restaurants à compléter</span>
        </Link>
        <Link className={styles.todayItem} href="/owner/qr-codes" prefetch={false}>
          <span className={styles.todayCount}>{today.qrToDo}</span>
          <span className={styles.todayLabel}>QR à générer / tester</span>
        </Link>
        <Link className={styles.todayItem} href="/owner/medias" prefetch={false}>
          <span className={styles.todayCount}>{today.photosMissing}</span>
          <span className={styles.todayLabel}>Plats sans photo</span>
        </Link>
        <Link className={styles.todayItem} href="/owner/menus" prefetch={false}>
          <span className={styles.todayCount}>{today.readyToPublish}</span>
          <span className={styles.todayLabel}>Menus prêts à publier</span>
        </Link>
        <Link className={styles.todayItem} href="/owner/3d-ar" prefetch={false}>
          <span className={styles.todayCount}>{today.immersiveGaps}</span>
          <span className={styles.todayLabel}>Manques 3D / AR</span>
        </Link>
      </section>

      <StatGroup title="Business">
        <StatTile label="Restaurants total" value={data.stats.totalRestaurants} primary />
        <StatTile label="Actifs" value={data.stats.activeRestaurants} />
        <StatTile label="En setup" value={data.stats.setupNeededRestaurants} />
        <StatTile label="Actions critiques" value={data.stats.actionsToTreat} />
      </StatGroup>

      <StatGroup title="Produit">
        <StatTile label="Menus prêts" value={data.stats.menuReadyRestaurants} />
        <StatTile label="QR prêts" value={data.stats.qrReadyRestaurants} />
        <StatTile label="Plats total" value={data.stats.totalDishes} />
        <StatTile label="Plats avec photos" value={data.stats.dishesWithPhotos} />
      </StatGroup>

      <StatGroup title="Expérience">
        <StatTile label="Plats 3D / AR" value={data.stats.dishesWithImmersive} />
        <StatTile label="Ouvertures menu" value={data.stats.menuOpensToday} />
        <StatTile label="Plats consultés" value={data.stats.dishViewsToday} />
        <StatTile label="Plus actif" value={data.stats.mostActiveRestaurant} />
      </StatGroup>

      <OwnerAiPanel
        initialPriorities={priorities}
        recommendations={data.recommendations}
        note={
          data.source === "fallback"
            ? "Données de présentation (Supabase non connecté)."
            : data.note
        }
      />
    </>
  );
}
