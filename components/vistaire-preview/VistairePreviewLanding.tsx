import Image from "next/image";
import type { StaticImageData } from "next/image";
import restaurantBackground from "@/Framer/PhotoRestoComplet.png";
import lobsterPlate from "@/Framer/PlatHomard.png";
import restaurantTable from "@/Framer/Photo table.png";
import restaurantGuest from "@/Framer/PhotoFemme.png";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import styles from "./VistairePreviewLanding.module.css";

const landingVideoSrc = "/videos/Vistaire2.mp4";

type FramerImageProps = {
  alt: string;
  className?: string;
  priority?: boolean;
  src: StaticImageData;
};

function FramerImage({ alt, className, priority, src }: FramerImageProps) {
  return (
    <Image
      alt={alt}
      className={className}
      fill
      priority={priority}
      quality={100}
      sizes="(max-width: 720px) 100vw, 560px"
      src={src}
      unoptimized
    />
  );
}

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

export function VistairePreviewLanding({
  routeMode = "preview"
}: {
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

      <section
        aria-label="Nouvelle landing Vistaire"
        className={styles.hero}
        id="accueil"
      >
        <div className={styles.previewFrame}>
          <article className={`${styles.card} ${styles.videoCard}`}>
            <video
              aria-label="Démonstration vidéo de la carte digitale Vistaire"
              autoPlay
              className={styles.heroVideo}
              controls={false}
              loop
              muted
              playsInline
              poster="/frames/menualive/frame_0200.webp"
              preload="metadata"
            >
              <source src={landingVideoSrc} type="video/mp4" />
            </video>
            <div aria-hidden="true" className={styles.videoShade} />
            <div className={styles.videoCopy}>
              <h1>
                VISTAIRE
                <span className={styles.srOnly}>
                  , carte digitale premium pour restaurants haut de gamme
                </span>
              </h1>
              <p>CARTE DIGITALE PREMIUM</p>
            </div>
          </article>

          <div className={styles.rightGrid}>
            <article className={`${styles.card} ${styles.menuCard}`} id="carte">
              <FramerImage
                alt="Plat de homard premium servi dans une assiette noire"
                className={styles.cardImage}
                priority
                src={lobsterPlate}
              />
              <div aria-hidden="true" className={styles.menuShade} />
              <div className={styles.menuCopy}>
                <h2>CARTE DIGITALE</h2>
                <a className={styles.darkButton} href={routes.menu}>
                  Explorer
                  <ArrowIcon />
                </a>
              </div>
            </article>

            <div className={styles.bottomGrid}>
              <article className={`${styles.aboutCard}`} id="a-propos">
                <div aria-hidden="true" className={styles.aboutShade} />
                <div className={styles.aboutContent}>
                  <p className={styles.aboutTag}>À propos de Vistaire</p>
                  <h2>Une carte digitale qui donne envie</h2>
                  <p>
                    Vistaire transforme le QR code d’un restaurant en carte
                    digitale premium : menu clair, fiches plats visuelles et
                    3D/AR quand elle apporte une vraie valeur
                  </p>
                  <p>
                    Basé à Montréal, Vistaire aide les restaurants du Québec à
                    remplacer un PDF par une expérience mobile claire,
                    citable et fidèle à la salle.
                  </p>
                </div>
              </article>

              <article className={`${styles.card} ${styles.discoveryCard}`}>
                <div
                  aria-hidden="true"
                  className={`${styles.discoveryImage} ${styles["vistaire-discovery-image--first"]}`}
                >
                  <FramerImage
                    alt=""
                    className={`${styles.cardImage} ${styles.discoveryTableImage}`}
                    src={restaurantTable}
                  />
                </div>
                <div
                  aria-hidden="true"
                  className={`${styles.discoveryImage} ${styles["vistaire-discovery-image--second"]}`}
                >
                  <FramerImage
                    alt=""
                    className={`${styles.cardImage} ${styles.discoveryGuestImage}`}
                    src={restaurantGuest}
                  />
                </div>
                <div aria-hidden="true" className={styles.discoveryShade} />
                <div className={styles.discoveryCopy}>
                  <h2>
                    DÉCOUVRIR
                    <span>VISTAIRE</span>
                  </h2>
                  <a className={styles.lightButton} href={routes.about}>
                    Découvrir
                    <ArrowIcon />
                  </a>
                  <div aria-label="Image active" className={styles.dots}>
                    <span className={styles.dotFirst} />
                    <span className={styles.dotSecond} />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>

        <PreviewNav activeSection="home" routeMode={routeMode} />
      </section>

      <PreviewFooter routeMode={routeMode} />
    </main>
  );
}
