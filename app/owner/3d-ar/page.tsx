import styles from "@/components/owner/OwnerCockpit.module.css";
import { Badge, EmptyState, ModuleHeader, Panel, StatGroup, StatTile } from "@/components/owner/OwnerUi";
import { getOwnerDashboard } from "@/lib/owner/dashboard";

export const dynamic = "force-dynamic";

export default async function OwnerImmersivePage() {
  const data = await getOwnerDashboard();
  const withImmersive = data.restaurants.filter((r) => r.immersiveDishCount > 0);
  const withoutImmersive = data.restaurants.filter(
    (r) => r.dishCount > 0 && r.immersiveDishCount === 0
  );

  return (
    <>
      <ModuleHeader
        title="3D / AR"
        description="Pipeline immersif. Détection des assets via les colonnes 3D/AR de menu_dishes. Aucun modèle GLB/USDZ n'est chargé ici tant que vous ne l'ouvrez pas."
      />

      <StatGroup title="Couverture immersive">
        <StatTile label="Plats 3D / AR" value={data.stats.dishesWithImmersive} primary />
        <StatTile label="Restaurants avec 3D/AR" value={withImmersive.length} />
        <StatTile label="Restaurants sans 3D/AR" value={withoutImmersive.length} />
      </StatGroup>

      <Panel title="Restaurants avec assets immersifs">
        {withImmersive.length === 0 ? (
          <EmptyState>Aucun asset 3D / AR détecté dans les données disponibles.</EmptyState>
        ) : (
          <div className={styles.cardGrid}>
            {withImmersive.map((restaurant) => (
              <article key={restaurant.id} className={styles.moduleCard}>
                <p className={styles.moduleCardTitle}>{restaurant.name}</p>
                <span className={styles.moduleCardMeta}>
                  {restaurant.immersiveDishCount} plat(s) immersif(s)
                </span>
                <div className={styles.pillRow}>
                  <Badge tone="ready">3D / AR</Badge>
                  <Badge tone="muted">À tester iPhone / Android</Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Restaurants à équiper en 3D / AR">
        {withoutImmersive.length === 0 ? (
          <EmptyState>Tous les menus actifs ont au moins un plat immersif.</EmptyState>
        ) : (
          <div className={styles.cardGrid}>
            {withoutImmersive.map((restaurant) => (
              <article key={restaurant.id} className={styles.moduleCard}>
                <p className={styles.moduleCardTitle}>{restaurant.name}</p>
                <span className={styles.moduleCardMeta}>
                  {restaurant.dishCount} plats · fallback image
                </span>
                <Badge tone="warn">Aucun asset immersif</Badge>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <p className={styles.sourceTag}>
        La validation Quick Look iPhone / Scene Viewer Android n&apos;est pas
        confirmée depuis ce module et doit être testée sur appareil réel.
      </p>
    </>
  );
}
