import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import restaurantBackground from "@/Framer/PhotoRestoComplet5.png";
import pageDigitalPhoto from "@/Framer/PageDigital.png";
import photoDigital2 from "@/Framer/PhotoDigital2.png";
import photoDigital3 from "@/Framer/PhotoDigital3.png";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import styles from "./VistaireMenuDigitalRestaurantPreview.module.css";

const selectivePrinciples = [
  {
    title: "Sélective",
    text:
      "La 3D / AR n'est pas appliquée à toute la carte. Elle sert les plats signatures qui gagnent à être vus en volume."
  },
  {
    title: "Mobile-first",
    text:
      "Le client comprend le plat depuis son téléphone avant de demander une vue immersive."
  },
  {
    title: "Sans gadget",
    text:
      "Vistaire garde la salle, le service et la cuisine au centre. L'immersion aide le choix, elle ne remplace pas l'expérience."
  }
] as const;

const arUseCases = [
  "Dessert signature avec volume, texture ou dressage important.",
  "Plat iconique dont la présentation influence la décision.",
  "Création à expliquer sans alourdir la carte principale."
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

export function VistaireMenu3dArRestaurantPreview({
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
    h1 ?? "Menu 3D AR restaurant : montrer le plat quand cela aide vraiment";
  const internalLinks = [
    { label: "Voir la carte", href: routes.menu },
    { label: "Menu digital restaurant", href: routes.menuDigital },
    { label: "Parler à Vistaire", href: routes.contact }
  ] as const;

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
        aria-labelledby="menu-3d-ar-restaurant-title"
        className={styles.hero}
        id="accueil"
      >
        <div className={styles.previewFrame}>
          <article className={`${styles.card} ${styles.heroCopy}`}>
            <p className={styles.badge}>3D / AR sélective</p>
            <h1 id="menu-3d-ar-restaurant-title">
              {pageTitle}
            </h1>
            <p className={styles.heroLead}>
              Vistaire intègre la 3D et la réalité augmentée avec retenue :
              uniquement sur les plats où le volume, la texture ou le geste de
              service rendent la décision plus claire.
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
                alt="Vue 3D et réalité augmentée Vistaire présentées sur téléphone"
                className={styles.visualImage}
                fill
                priority
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 20vw"
                src={photoDigital2}
                unoptimized
              />
            </figure>
          </article>

          <section
            className={`${styles.card} ${styles.problemCard}`}
            aria-labelledby="selective-title"
          >
            <p className={styles.badge}>Usage premium</p>
            <h2 id="selective-title">
              La 3D / AR doit rester utile, pas spectaculaire pour rien
            </h2>
            <p>
              Dans un restaurant haut de gamme, une vue immersive doit prolonger
              la carte et rassurer le client. Elle n&apos;a de valeur que si elle
              clarifie un plat, une texture ou une présentation.
            </p>
            <div className={styles.problemList}>
              {selectivePrinciples.map((principle) => (
                <section key={principle.title}>
                  <h3>{principle.title}</h3>
                  <p>{principle.text}</p>
                </section>
              ))}
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.mobileProofCard}`}
            aria-labelledby="ar-mobile-title"
          >
            <figure className={styles.visualFigure}>
              <Image
                alt="Cliente consultant une carte digitale Vistaire dans un restaurant sombre"
                className={styles.visualImage}
                fill
                priority
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 58vw"
                src={photoDigital3}
                unoptimized
              />
            </figure>
            <div className={styles.visualCopy}>
              <p className={styles.badge}>Avant la vue immersive</p>
              <h2 id="ar-mobile-title">La fiche plat reste le point d&apos;entrée</h2>
              <p>
                Vistaire commence par une fiche claire : nom, prix, description,
                allergènes et visuel. La 3D / AR arrive ensuite, seulement si le
                plat mérite une couche de compréhension supplémentaire.
              </p>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.comparisonCard}`}
            aria-labelledby="use-cases-title"
          >
            <div className={styles.sectionIntro}>
              <p className={styles.badge}>Cas d&apos;usage</p>
              <h2 id="use-cases-title">Quand la 3D / AR apporte une vraie valeur</h2>
              <p>
                Les meilleurs usages sont rares, visibles et liés à une vraie
                question client : taille, texture, dressage, ou compréhension du
                plat signature.
              </p>
            </div>
            <div className={styles.benefitGrid}>
              {arUseCases.map((useCase) => (
                <article className={styles.benefitItem} key={useCase}>
                  <h3>{useCase}</h3>
                </article>
              ))}
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.premiumPanel}`}
            aria-labelledby="premium-ar-title"
          >
            <div className={styles.premiumContent}>
              <div className={styles.sectionIntro}>
                <p className={styles.badge}>Restaurant haut de gamme</p>
                <h2 id="premium-ar-title">
                  Une carte immersive qui respecte le service
                </h2>
                <p>
                  Vistaire ne transforme pas la table en démonstration
                  technique. Le client voit ce qui l&apos;aide à choisir, puis
                  revient naturellement à la carte et au service.
                </p>
              </div>
            </div>
            <figure className={`${styles.visualFigure} ${styles.premiumVisual}`}>
              <Image
                alt="Fiche plat Vistaire sur téléphone à côté d'un dessert signature"
                className={styles.visualImage}
                fill
                quality={100}
                sizes="(max-width: 920px) calc(100vw - 56px), 24vw"
                src={pageDigitalPhoto}
                unoptimized
              />
            </figure>
          </section>

          <section
            className={`${styles.card} ${styles.finalCta}`}
            aria-labelledby="final-3d-cta-title"
          >
            <div>
              <p className={styles.badge}>Prochaine étape</p>
              <h2 id="final-3d-cta-title">
                Vos plats signatures méritent une présentation mesurée
              </h2>
              <p>
                Parlons des plats qui gagnent vraiment à être vus en volume et
                de la façon de les intègrer sans alourdir votre carte.
              </p>
            </div>
            <div className={styles.finalActions}>
              <Link
                className={styles.primaryButton}
                href={routes.appointment}
                prefetch={false}
              >
                Prendre rendez-vous
                <ArrowIcon />
              </Link>
              <Link className={styles.secondaryButton} href={routes.menu} prefetch={false}>
                Voir la carte
              </Link>
            </div>
            <nav className={styles.internalLinks} aria-label="Liens internes Vistaire">
              {internalLinks.map((item) => (
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
