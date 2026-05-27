import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import comparisonPhoto from "@/Framer/PhotoComparaisonPDF.png";
import detailComparisonPhoto from "@/Framer/PhotoPDFvsDigitalDetail.png";
import restaurantBackground from "@/Framer/PhotoRestoComplet3.png";
import { getAllDishes } from "@/lib/demoMenuData";
import { buildPdfComparePreviewData } from "@/lib/pdfComparePreviewData";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import { VistairePreviewPdfCompareSlider } from "./VistairePreviewPdfCompareSlider";
import styles from "./VistairePdfVsMenuDigitalPreview.module.css";

const menuHref = "/vistaire-preview/demo";

const pdfProblems = [
  {
    title: "Lecture difficile",
    text:
      "Sur mobile, le client pince l'écran, cherche les catégories et perd le fil de la carte au lieu de regarder les plats."
  },
  {
    title: "Présentation statique",
    text:
      "Un PDF reste une page fixe. Les plats signatures, les allergènes et les prix existent, mais sans parcours clair ni mise en scène."
  },
  {
    title: "Mise à jour lourde",
    text:
      "Modifier une carte PDF demande souvent de régénérer un fichier, vérifier le lien et espérer que l'ancienne version ne circule plus."
  }
] as const;

const digitalBenefits = [
  "Navigation par catégories lisibles",
  "Fiches plats visuelles et textes courts",
  "Prix, allergènes et badges utiles plus clairs",
  "Photos premium qui donnent envie",
  "3D / AR sélective seulement quand elle aide le choix",
  "Expérience mobile fluide, sans application à télécharger"
] as const;

const comparisonRows = [
  {
    label: "Lisibilité mobile",
    pdf: "Zoom, déplacement latéral et lecture dense.",
    standard: "Texte plus lisible, mais souvent peu élégant.",
    vistaire: "Carte pensée pour le téléphone, avec hiérarchie claire."
  },
  {
    label: "Image haut de gamme",
    pdf: "Le fichier peut paraître utilitaire.",
    standard: "Interface fonctionnelle, parfois générique.",
    vistaire: "Surfaces sombres, visuels food-first et ton premium."
  },
  {
    label: "Fiches plats",
    pdf: "Détails limités par la mise en page.",
    standard: "Descriptions possibles, souvent uniformes.",
    vistaire: "Fiches visuelles avec prix, allergènes, badges et récit court."
  },
  {
    label: "Navigation",
    pdf: "Le client cherche dans une page complète.",
    standard: "Catégories simples.",
    vistaire: "Parcours mobile guidé, utile pendant le service."
  },
  {
    label: "Mise à jour",
    pdf: "Nouveau fichier et risques d'ancienne version.",
    standard: "Plus rapide, selon l'outil.",
    vistaire: "Carte digitale plus simple à faire évoluer."
  },
  {
    label: "Capacité à donner envie",
    pdf: "Peu d'espace pour la photo et l'intention.",
    standard: "Visuels possibles mais rarement mémorables.",
    vistaire: "Présentation des plats au centre de l'expérience."
  },
  {
    label: "3D / AR",
    pdf: "Aucune expérience immersive utile.",
    standard: "Option souvent gadget si elle est partout.",
    vistaire: "3D / AR sélective pour les plats qui le méritent."
  },
  {
    label: "Expérience client",
    pdf: "Lecture subie après le QR code.",
    standard: "Consultation correcte.",
    vistaire: "Expérience claire, visuelle et cohérente avec la salle."
  }
] as const;

const internalLinks = [
  { label: "Explorer la carte", href: menuHref },
  { label: "Comprendre Vistaire", href: "/vistaire-preview/a-propos" },
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

export function VistairePdfVsMenuDigitalPreview({
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
    h1 ?? "PDF vs menu digital : pourquoi les restaurants haut de gamme doivent évoluer";
  const pageInternalLinks =
    routeMode === "preview"
      ? internalLinks
      : [
          { label: "Explorer la carte", href: routes.menu },
          { label: "Comprendre Vistaire", href: routes.about },
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
        aria-labelledby="pdf-vs-menu-digital-preview-title"
        className={styles.hero}
      >
        <div className={styles.previewFrame}>
          <article className={`${styles.card} ${styles.heroCopy}`}>
            <p className={styles.badge}>Guide restaurateur</p>
            <h1 id="pdf-vs-menu-digital-preview-title">{pageTitle}</h1>
            <p className={styles.heroLead}>
              Un menu PDF reproduit une carte papier sur un écran. Vistaire transforme la carte en expérience mobile premium : claire, visuelle, rapide et pensée pour donner envie.
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
          </article>

          <article className={`${styles.card} ${styles.sliderCard}`}>
            <div className={styles.sliderIntro}>
              <p>PDF ou Vistaire</p>
              <h2>La différence se voit sur mobile.</h2>
            </div>
            <VistairePreviewPdfCompareSlider
              preview={comparePreview}
              className={styles.compareSlider}
            />
          </article>

          <article className={`${styles.card} ${styles.problemCard}`}>
            <p className={styles.badge}>Menu PDF</p>
            <h2>Le problème du menu PDF</h2>
            <div className={styles.problemList}>
              {pdfProblems.map((problem) => (
                <section key={problem.title}>
                  <h3>{problem.title}</h3>
                  <p>{problem.text}</p>
                </section>
              ))}
            </div>
          </article>

          <section
            className={`${styles.card} ${styles.digitalCard}`}
            aria-labelledby="digital-premium-title"
          >
            <div className={styles.sectionIntro}>
              <p className={styles.badge}>Carte digitale premium</p>
              <h2 id="digital-premium-title">
                {"Ce qu'apporte une carte digitale premium"}
              </h2>
              <p>
                {"Une bonne carte mobile ne remplace pas la salle. Elle prolonge le niveau d'attention du restaurant, clarifie le choix et donne aux plats l'espace qu'ils méritent."}
              </p>
            </div>
            <div className={styles.benefitGrid}>
              {digitalBenefits.map((benefit) => (
                <article className={styles.benefitItem} key={benefit}>
                  <h3>{benefit}</h3>
                </article>
              ))}
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.comparisonCard}`}
            id="comparaison"
            aria-labelledby="comparison-title"
          >
            <div className={styles.comparisonGrid}>
              <div className={styles.comparisonContent}>
                <div className={styles.sectionIntro}>
                <p className={styles.badge}>Comparaison</p>
                <h2 id="comparison-title">Menu PDF vs menu digital</h2>
                <p>
                  {"Le QR code n'est pas le problème. Ce qui compte, c'est ce que le client découvre après le scan : un fichier à subir, une interface standard, ou une expérience Vistaire."}
                </p>
              </div>

              <figure className={styles.comparisonVisual}>
                <Image
                  alt="Deux téléphones comparent un menu PDF et une carte digitale Vistaire sur une table de restaurant haut de gamme."
                  fill
                  quality={100}
                  sizes="(max-width: 920px) calc(100vw - 72px), 620px"
                  src={comparisonPhoto}
                  unoptimized
                />
              </figure>

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
              </div>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.restaurantPanel}`}
            aria-labelledby="restaurant-title"
          >
            <figure className={styles.detailVisual}>
              <Image
                alt="Fiche plat Vistaire affichée sur téléphone à côté d'un plat de homard dans un restaurant haut de gamme."
                fill
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 72px), 620px"
                src={detailComparisonPhoto}
                unoptimized
              />
            </figure>
            <p className={styles.badge}>Restaurant haut de gamme</p>
            <h2 id="restaurant-title">Un menu digital ne doit pas transformer le restaurant en application froide</h2>
            <p>
              {"Vistaire garde le plat, la salle et l'image du restaurant au centre. La 3D / AR reste sélective, utile et réservée aux créations qui gagnent vraiment à être visualisées. Le digital sert la décision du client sans voler la place de l'accueil, du service et de la cuisine."}
            </p>
          </section>

          <section
            className={`${styles.card} ${styles.finalCta}`}
            aria-labelledby="final-cta-title"
          >
            <div>
              <p className={styles.badge}>Prochaine étape</p>
              <h2 id="final-cta-title">{"Votre carte mérite mieux qu'un PDF"}</h2>
              <p>
                Parlons de votre carte, de vos plats signatures, de vos
                contraintes de service et du niveau de présentation que vos
                clients doivent ressentir sur mobile.
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
