import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import restaurantBackground from "@/Framer/PhotoRestoComplet6.png";
import photoQrCode1 from "@/Framer/PhotoQRcode1.png";
import photoQrCode2 from "@/Framer/PhotoQRcode2.png";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import styles from "./VistaireMenuDigitalRestaurantPreview.module.css";

const menuHref = "/vistaire-preview/demo";

const qrCells = new Set([
  0, 1, 2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 22, 24, 25, 27, 28, 30,
  31, 33, 35, 36, 38, 40, 42, 43, 44, 45, 46, 48
]);

const journeySteps = [
  {
    step: "01",
    title: "Scan discret",
    text: "Le client ouvre la carte en quelques secondes, sans application et sans friction."
  },
  {
    step: "02",
    title: "Lecture mobile",
    text: "Les catégories, les prix et les plats restent lisibles dans la lumière de la salle."
  },
  {
    step: "03",
    title: "Fiche plat",
    text: "Le client passe d'un nom à une vraie présentation : visuel, détails et allergènes."
  },
  {
    step: "04",
    title: "Choix plus sûr",
    text: "La carte aide la décision sans voler la place du service ni du restaurant."
  }
] as const;

const scanPrinciples = [
  "Un QR code sobre, facile à placer sur table ou chevalet.",
  "Une page d'arrivée mobile-first, pas un PDF qui force le zoom.",
  "Un parcours qui met les plats en valeur dès les premières secondes."
] as const;

const comparisonItems = [
  {
    title: "QR code seul",
    points: [
      "Accès rapide, mais expérience variable.",
      "Souvent un PDF ou une liste standard derrière le scan.",
      "Peu de perception premium si la carte ouverte semble utilitaire."
    ]
  },
  {
    title: "QR code Vistaire",
    points: [
      "Entrée discrète vers une carte digitale haut de gamme.",
      "Fiches plats, visuels, prix et allergènes pensés pour le téléphone.",
      "3D / AR sélective seulement quand elle améliore la compréhension du plat."
    ]
  }
] as const;

const internalLinks = [
  { label: "Explorer la carte", href: menuHref },
  { label: "Comparer avec un PDF", href: "/vistaire-preview/pdf-vs-menu-digital" },
  { label: "Menu digital restaurant", href: "/vistaire-preview/menu-digital-restaurant" },
  { label: "Parler à Vistaire", href: "/vistaire-preview/contact" }
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

function QrCodeMark() {
  return (
    <div className={styles.qrCodeMark} aria-hidden="true">
      {Array.from({ length: 49 }, (_, index) => (
        <span
          className={qrCells.has(index) ? styles.qrCellOn : undefined}
          key={index}
        />
      ))}
    </div>
  );
}

export function VistaireMenuQrCodeRestaurantPreview({
  h1,
  routeMode = "preview",
  seoAppendix
}: {
  h1?: string;
  routeMode?: VistaireRouteMode;
  seoAppendix?: ReactNode;
}) {
  const routes = getVistaireChromeRoutes(routeMode);
  const pageTitle =
    h1 ?? "Menu QR code restaurant : le scan doit ouvrir une expérience";
  const pageInternalLinks =
    routeMode === "preview"
      ? internalLinks
      : [
          { label: "Explorer la carte", href: routes.menu },
          { label: "Comparer avec un PDF", href: routes.pdfVsDigital },
          { label: "Menu digital restaurant", href: routes.menuDigital },
          { label: "Parler à Vistaire", href: routes.contact }
        ];
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
        aria-labelledby="menu-qr-code-restaurant-preview-title"
        className={styles.hero}
        id="accueil"
      >
        <div className={styles.previewFrame}>
          <section
            className={`${styles.card} ${styles.qrHeroPanel}`}
            aria-labelledby="menu-qr-code-restaurant-preview-title"
          >
            <div className={styles.qrHeroText}>
              <p className={styles.badge}>QR code restaurant</p>
              <h1 id="menu-qr-code-restaurant-preview-title">
                {pageTitle}
              </h1>
              <p className={styles.heroLead}>
                Le QR code n&apos;est pas la carte. C&apos;est le premier geste.
                Vistaire transforme ce scan en carte mobile premium : lisible,
                visuelle, rapide et fidèle à l&apos;ambiance de la salle.
              </p>
              <div className={styles.heroActions} aria-label="Actions principales">
                <Link className={styles.primaryButton} href={routes.menu} prefetch={false}>
                  Voir la carte
                  <ArrowIcon />
                </Link>
                <Link
                  className={styles.secondaryButton}
                  href={routes.appointment}
                  prefetch={false}
                >
                  Prendre rendez-vous
                </Link>
              </div>
            </div>
            <figure className={`${styles.visualFigure} ${styles.qrHeroVisual}`}>
              <Image
                alt="Cliente consultant une carte Vistaire ouverte après scan QR à table"
                className={styles.visualImage}
                fill
                priority
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 42vw"
                src={photoQrCode1}
                unoptimized
              />
            </figure>
          </section>

          <section
            className={`${styles.card} ${styles.qrScanPanel}`}
            aria-labelledby="scan-title"
          >
            <div className={styles.qrMarkWrap}>
              <QrCodeMark />
              <span>Table 12 · Vistaire</span>
            </div>
            <div className={styles.qrScanCopy}>
              <p className={styles.badge}>Après le scan</p>
              <h2 id="scan-title">Le QR code n&apos;est qu&apos;une porte d&apos;entrée</h2>
              <p>
                Un code imprimé peut rester discret et premium. La différence se
                joue surtout sur ce qui s&apos;ouvre ensuite : une carte claire,
                belle et utilisable pendant le service.
              </p>
              <div className={styles.qrPrinciples}>
                {scanPrinciples.map((principle) => (
                  <article key={principle}>
                    <h3>{principle}</h3>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.qrJourneyPanel}`}
            aria-labelledby="journey-title"
          >
            <div className={styles.sectionIntro}>
              <p className={styles.badge}>Parcours client</p>
              <h2 id="journey-title">Du scan à la décision</h2>
              <p>
                La page QR code doit rassurer vite : accès immédiat, lecture
                naturelle, fiche plat utile et envie de commander.
              </p>
            </div>
            <ol className={styles.qrJourneyList}>
              {journeySteps.map((item) => (
                <li key={item.step}>
                  <span>{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section
            className={`${styles.card} ${styles.qrExperiencePanel}`}
            aria-labelledby="experience-title"
          >
            <figure className={styles.visualFigure}>
              <Image
                alt="Vue 3D et réalité augmentée Vistaire sur téléphone après ouverture du menu QR"
                className={styles.visualImage}
                fill
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 38vw"
                src={photoQrCode2}
                unoptimized
              />
            </figure>
            <div className={styles.visualCopy}>
              <p className={styles.badge}>Carte mobile premium</p>
              <h2 id="experience-title">Le scan doit mener à quelque chose de désirable</h2>
              <p>
                Vistaire évite l&apos;effet gadget : le QR code ouvre une carte
                qui donne envie, puis des fiches plats et une 3D / AR sélective
                quand cela aide vraiment le choix.
              </p>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.qrComparisonPanel}`}
            aria-labelledby="qr-comparison-title"
          >
            <div className={styles.sectionIntro}>
              <p className={styles.badge}>Comparaison</p>
              <h2 id="qr-comparison-title">QR code seul ou QR code Vistaire</h2>
            </div>
            <div className={styles.qrComparisonGrid}>
              {comparisonItems.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.finalCta}`}
            aria-labelledby="qr-final-cta-title"
          >
            <div>
              <p className={styles.badge}>Prochaine étape</p>
              <h2 id="qr-final-cta-title">Votre QR code mérite mieux qu&apos;un PDF</h2>
              <p>
                Parlons de la première impression que vos clients découvrent
                après le scan, et de la façon dont Vistaire peut prolonger votre
                salle sur mobile.
              </p>
            </div>
            <div className={styles.finalActions}>
              <Link className={styles.primaryButton} href={routes.appointment} prefetch={false}>
                Prendre rendez-vous
                <ArrowIcon />
              </Link>
              <Link className={styles.secondaryButton} href={routes.menu} prefetch={false}>
                Voir la carte
              </Link>
            </div>
            <nav className={styles.internalLinks} aria-label="Liens internes Vistaire">
              {pageInternalLinks.map((item) => (
                <Link href={item.href} key={item.href} prefetch={false}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>

          {seoAppendix}
        </div>
      </section>

      <PreviewFooter routeMode={routeMode} width="wide" />
    </main>
  );
}
