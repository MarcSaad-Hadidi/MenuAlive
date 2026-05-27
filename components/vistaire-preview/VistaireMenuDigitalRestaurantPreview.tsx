import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import restaurantBackground from "@/Framer/PhotoRestoComplet5.png";
import pageDigitalPhoto from "@/Framer/PageDigital.png";
import photoDigital2 from "@/Framer/PhotoDigital2.png";
import photoDigital3 from "@/Framer/PhotoDigital3.png";
import { getAllDishes } from "@/lib/demoMenuData";
import { buildPdfComparePreviewData } from "@/lib/pdfComparePreviewData";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import { VistairePdfToDigitalHoverReveal } from "./VistairePdfToDigitalHoverReveal";
import styles from "./VistaireMenuDigitalRestaurantPreview.module.css";

const menuHref = "/vistaire-preview/demo";

const pdfProblems = [
  {
    title: "Zoom forcé",
    text:
      "Le client agrandit, recadre et perd le fil au lieu de parcourir la carte naturellement."
  },
  {
    title: "Plats peu désirables",
    text:
      "Une page fixe laisse peu de place aux visuels, aux détails utiles et aux signatures de la maison."
  },
  {
    title: "Mobile secondaire",
    text:
      "Le PDF reproduit l'imprimé. Vistaire pense d'abord l'écran que le client tient à table."
  },
  {
    title: "Image moins premium",
    text:
      "Un fichier statique peut donner une impression pratique, mais rarement une vraie expérience de restaurant."
  }
] as const;

const comparisonRows = [
  {
    label: "Lisibilité mobile",
    pdf: "Zoom, page fixe et lecture dense.",
    standard: "Liste plus lisible, souvent générique.",
    vistaire: "Navigation claire, catégories et fiches adaptées au téléphone."
  },
  {
    label: "Qualité visuelle",
    pdf: "Peu d'espace pour la mise en scène.",
    standard: "Visuels possibles, mais rarement premium.",
    vistaire: "Food-first, surfaces sombres et accents champagne."
  },
  {
    label: "Envie de choisir",
    pdf: "Le client cherche une ligne.",
    standard: "Le client consulte une liste.",
    vistaire: "Le client découvre des plats, des prix lisibles et des détails utiles."
  },
  {
    label: "Fiches plats",
    pdf: "Détails limités par la mise en page.",
    standard: "Descriptions possibles, souvent uniformes.",
    vistaire: "Fiches visuelles avec prix, allergènes, badges et récit court."
  },
  {
    label: "Mise à jour",
    pdf: "Nouveau fichier et risque d'ancienne version.",
    standard: "Plus rapide, selon l'outil.",
    vistaire: "Carte digitale plus simple à faire évoluer."
  },
  {
    label: "3D / AR",
    pdf: "Impossible dans le fichier.",
    standard: "Souvent gadget si tout est traité pareil.",
    vistaire: "Sélective, réservée aux plats qui gagnent à être vus en volume."
  }
] as const;

const premiumPoints = [
  "Une présentation sobre qui respecte l'identité du lieu.",
  "Des fiches plats visuelles sans transformer la carte en application froide.",
  "Une 3D / AR sélective, utile seulement quand elle rend le plat plus clair."
] as const;

const internalLinks = [
  { label: "Explorer la carte", href: menuHref },
  { label: "Comparer avec un PDF", href: "/vistaire-preview/pdf-vs-menu-digital" },
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

export function VistaireMenuDigitalRestaurantPreview({
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
    h1 ?? "Menu digital restaurant : une carte premium pensée pour le mobile";
  const pageInternalLinks =
    routeMode === "preview"
      ? internalLinks
      : [
          { label: "Explorer la carte", href: routes.menu },
          { label: "Comparer avec un PDF", href: routes.pdfVsDigital },
          { label: "Parler à Vistaire", href: routes.contact }
        ];
  const comparePreview = buildPdfComparePreviewData({
    activeCategorySlug: "tous",
    vistaireDishSlugs: getAllDishes().map((dish) => dish.slug)
  });

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
        aria-labelledby="menu-digital-restaurant-preview-title"
        className={styles.hero}
      >
        <div className={styles.previewFrame}>
          <article className={`${styles.card} ${styles.heroCopy}`}>
            <p className={styles.badge}>Guide restaurateur</p>
            <h1
              aria-label={pageTitle}
              id="menu-digital-restaurant-preview-title"
            >
              {pageTitle}
            </h1>
            <p className={styles.heroLead}>
              Vistaire transforme le QR code d&apos;un restaurant en carte digitale
              élégante, rapide et visuelle : catégories claires, fiches plats
              désirables, prix lisibles, allergènes et 3D / AR sélective quand
              elle apporte une vraie valeur.
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
            <figure className={`${styles.visualFigure} ${styles.heroVisual}`}>
              <Image
                alt="Dessert signature avec fiche plat Vistaire affichée sur téléphone"
                className={styles.visualImage}
                fill
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 20vw"
                src={pageDigitalPhoto}
                unoptimized
              />
            </figure>
          </article>

          <article
            className={`${styles.card} ${styles.problemCard}`}
            aria-labelledby="pdf-problem-title"
          >
            <p className={styles.badge}>Menu PDF</p>
            <h2 id="pdf-problem-title">Pourquoi un menu PDF ne suffit plus</h2>
            <p>
              Le PDF reste pratique pour imprimer une carte, mais il se comporte
              mal dans le contexte réel du service : table, lumière, téléphone
              tenu d&apos;une main et décision rapide.
            </p>
            <div className={styles.problemList}>
              {pdfProblems.map((problem) => (
                <section key={problem.title}>
                  <h3>{problem.title}</h3>
                  <p>{problem.text}</p>
                </section>
              ))}
            </div>
          </article>

          <article
            className={`${styles.card} ${styles.revealCard}`}
            id="carte"
            aria-labelledby="hover-reveal-title"
          >
            <div className={styles.revealIntro}>
              <p>PDF vers Vistaire</p>
              <h2 id="hover-reveal-title">
                Du menu PDF à l&apos;expérience Vistaire
              </h2>
              <span className={styles.desktopInstruction}>
                Survolez pour révéler Vistaire.
              </span>
              <span className={styles.mobileInstruction}>
                Glissez le doigt sur la carte pour révéler Vistaire.
              </span>
            </div>
            <div className={styles.revealPreviewWrap}>
              <VistairePdfToDigitalHoverReveal preview={comparePreview} />
            </div>
          </article>

          <section
            className={`${styles.card} ${styles.comparisonCard}`}
            aria-labelledby="comparison-title"
          >
            <div className={styles.sectionIntro}>
              <p className={styles.badge}>Comparaison</p>
              <h2 id="comparison-title">PDF, menu digital standard ou Vistaire</h2>
              <p>
                La différence ne tient pas seulement au QR code. Elle tient à ce
                que le client découvre après le scan : un fichier à subir, une
                interface standard, ou une expérience Vistaire.
              </p>
            </div>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th scope="col">Critère</th>
                  <th scope="col">Menu PDF</th>
                  <th scope="col">Menu digital standard</th>
                  <th scope="col">Vistaire</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td data-label="Menu PDF">{row.pdf}</td>
                    <td data-label="Menu digital standard">{row.standard}</td>
                    <td data-label="Vistaire">{row.vistaire}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section
            className={`${styles.card} ${styles.mobileProofCard}`}
            aria-labelledby="mobile-proof-title"
          >
            <figure className={styles.visualFigure}>
              <Image
                alt="Cliente consultant une carte digitale Vistaire sur téléphone pendant le service"
                className={styles.visualImage}
                fill
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 58vw"
                src={photoDigital3}
                unoptimized
              />
            </figure>
            <div className={styles.visualCopy}>
              <p className={styles.badge}>Carte mobile en situation</p>
              <h2 id="mobile-proof-title">Une carte pensée pour la table</h2>
              <p>
                Vistaire reste lisible dans le vrai contexte du restaurant :
                lumière basse, téléphone tenu d&apos;une main, décision rapide et
                plats qui doivent rester désirables.
              </p>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.premiumPanel}`}
            aria-labelledby="premium-title"
          >
            <div className={styles.premiumContent}>
              <div className={styles.sectionIntro}>
                <p className={styles.badge}>Restaurant haut de gamme</p>
                <h2 id="premium-title">
                  Pensé pour les restaurants haut de gamme
                </h2>
                <p>
                  Le digital doit prolonger l&apos;expérience du restaurant, pas la
                  remplacer. Vistaire garde la salle, les plats et le rythme du
                  service au centre.
                </p>
              </div>
              <div className={styles.benefitGrid}>
                {premiumPoints.map((point) => (
                  <article className={styles.benefitItem} key={point}>
                    <h3>{point}</h3>
                  </article>
                ))}
              </div>
            </div>
            <figure className={`${styles.visualFigure} ${styles.premiumVisual}`}>
              <Image
                alt="Vue 3D et réalité augmentée Vistaire présentées sur téléphone à table"
                className={styles.visualImage}
                fill
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 24vw"
                src={photoDigital2}
                unoptimized
              />
            </figure>
          </section>

          <section
            className={`${styles.card} ${styles.finalCta}`}
            aria-labelledby="final-cta-title"
          >
            <div>
              <p className={styles.badge}>Prochaine étape</p>
              <h2 id="final-cta-title">Votre carte mérite mieux qu&apos;un PDF</h2>
              <p>
                Parlons de votre carte, de vos plats signatures et du niveau de
                présentation que vos clients doivent ressentir sur mobile.
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
        </div>
      </section>

      {seoAppendix}
      <PreviewFooter routeMode={routeMode} width="wide" />
    </main>
  );
}
