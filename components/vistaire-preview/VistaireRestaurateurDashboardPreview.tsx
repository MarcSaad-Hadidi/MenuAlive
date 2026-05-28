import Image from "next/image";
import Link from "next/link";
import restaurantBackground from "@/Framer/PhotoRestoComplet5.png";
import lobsterPlate from "@/Framer/PlatHomard.png";
import pageDigitalPhoto from "@/Framer/PageDigital.png";
import restaurantTable from "@/Framer/Photo table.png";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import styles from "./VistaireRestaurateurDashboardPreview.module.css";

const stats = [
  { label: "Menu actif", value: "12 plats" },
  { label: "QR menu", value: "Prêt" },
  { label: "Photos", value: "10/12" },
  { label: "3D / AR", value: "4 signatures" }
] as const;

const attentionSignals = [
  "Homard bleu attire le plus d'attention au souper.",
  "Deux fiches restent à compléter avant présentation.",
  "Le QR pointe vers la carte client, jamais vers l'admin.",
  "Les plats signatures guident les prochains visuels."
] as const;

const readinessItems = [
  { label: "Carte client", value: "Visible" },
  { label: "Lien public", value: "Stable" },
  { label: "Photos", value: "À compléter" },
  { label: "Immersion", value: "Sélective" }
] as const;

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.buttonIcon}
      fill="none"
      viewBox="0 0 12 12"
    >
      <path
        d="M3.1 8.9 8.7 3.3m0 0H4.1m4.6 0v4.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function VistaireRestaurateurDashboardPreview({
  demoMenuUrl,
  demoQrSvg,
  routeMode = "production"
}: {
  demoMenuUrl: string;
  demoQrSvg: string;
  routeMode?: VistaireRouteMode;
}) {
  const routes = getVistaireChromeRoutes(routeMode);

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

      <div className={styles.topNav}>
        <PreviewNav activeSection="home" routeMode={routeMode} />
      </div>

      <section
        aria-labelledby="restaurateur-dashboard-title"
        className={styles.hero}
      >
        <div className={styles.previewFrame}>
          <section className={`${styles.card} ${styles.heroPanel}`}>
            <div className={styles.heroCopy}>
              <p className={styles.badge}>Aperçu restaurateur</p>
              <h1 id="restaurateur-dashboard-title">
                Le tableau de bord reste au service de la carte.
              </h1>
              <p className={styles.heroLead}>
                Vistaire montre au restaurateur ce qui compte vraiment après le
                scan : menu actif, QR de table, fiches à compléter, plats qui
                attirent l&apos;oeil et readiness avant de présenter la carte.
              </p>
              <div className={styles.heroActions}>
                <Link
                  className={styles.primaryButton}
                  href={routes.appointment}
                  prefetch={false}
                >
                  Prendre rendez-vous
                  <ArrowIcon />
                </Link>
                <Link
                  className={styles.secondaryButton}
                  href={routes.menu}
                  prefetch={false}
                >
                  Voir la carte exemple
                </Link>
                <Link
                  className={styles.secondaryButton}
                  href="/admin"
                  prefetch={false}
                >
                  Regarder le dashboard exemple
                </Link>
              </div>
            </div>

            <div className={styles.dashboardShell} aria-label="Aperçu dashboard">
              <div className={styles.dashboardTopline}>
                <span>Maison Élyse</span>
                <span>Menu public prêt</span>
              </div>
              <div className={styles.statsGrid}>
                {stats.map((stat) => (
                  <article key={stat.label}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </article>
                ))}
              </div>
              <div className={styles.dashboardBody}>
                <div className={styles.signatureDish}>
                  <Image
                    alt="Plat signature homard Vistaire"
                    fill
                    quality={100}
                    sizes="260px"
                    src={lobsterPlate}
                    unoptimized
                  />
                  <div>
                    <span>Plat suivi</span>
                    <strong>Homard bleu</strong>
                  </div>
                </div>
                <div className={styles.signalList}>
                  {attentionSignals.map((signal) => (
                    <p key={signal}>{signal}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.card} ${styles.qrPanel}`}>
            <div className={styles.qrCopy}>
              <p className={styles.badge}>QR code du menu</p>
              <h2>Un QR sobre, relié à la carte publique.</h2>
              <p>
                La page publique montre une simulation. Les vrais QR restent
                générés dans le cockpit owner et pointent vers le menu du
                restaurant, pas vers une route interne.
              </p>
              <p className={styles.menuUrl}>{demoMenuUrl}</p>
            </div>
            <div className={styles.qrMark}>
              <span
                aria-label="QR code démonstratif vers la carte exemple Vistaire"
                role="img"
                dangerouslySetInnerHTML={{ __html: demoQrSvg }}
              />
            </div>
          </section>

          <section className={`${styles.card} ${styles.mobilePanel}`}>
            <figure className={styles.phonePreview}>
              <Image
                alt="Aperçu mobile d'une carte Vistaire"
                fill
                quality={100}
                sizes="(max-width: 920px) 100vw, 360px"
                src={pageDigitalPhoto}
                unoptimized
              />
            </figure>
            <div className={styles.readinessPanel}>
              <p className={styles.badge}>Readiness</p>
              <h2>Ce que le restaurant comprend vite.</h2>
              <div className={styles.readinessGrid}>
                {readinessItems.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className={`${styles.card} ${styles.finalPanel}`}>
            <div>
              <p className={styles.badge}>Pourquoi ça aide</p>
              <h2>Pas un SaaS froid. Une lecture vivante de la carte.</h2>
              <p>
                Le dashboard restaurateur ne remplace pas le service. Il aide a
                garder la carte belle, complète et présentable, avec des actions
                simples plutôt qu&apos;un mur de graphes.
              </p>
            </div>
            <figure className={styles.tableImage}>
              <Image
                alt="Table de restaurant haut de gamme"
                fill
                quality={100}
                sizes="(max-width: 920px) 100vw, 420px"
                src={restaurantTable}
                unoptimized
              />
            </figure>
          </section>
        </div>
      </section>

      <PreviewFooter routeMode={routeMode} width="wide" />
    </main>
  );
}
