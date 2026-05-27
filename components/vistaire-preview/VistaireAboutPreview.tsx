import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import restaurantBackground from "@/Framer/PhotoRestoComplet3.png";
import lobsterPlate from "@/Framer/PlatHomard.png";
import mobileQrTable from "@/Framer/PageApropos2.png";
import restaurantGuest from "@/Framer/PageApropos.png";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import styles from "./VistaireAboutPreview.module.css";

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
      sizes="(max-width: 720px) calc(100vw - 36px), 430px"
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

export function VistaireAboutPreview({
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
        aria-label="À propos de Vistaire"
        className={styles.hero}
        id="a-propos"
      >
        <div className={styles.previewFrame}>
          <article className={`${styles.card} ${styles.introCard}`}>
            <div aria-hidden="true" className={styles.textShade} />
            <div className={styles.introCopy}>
              <p className={styles.badge}>À propos</p>
              <h1>Vistaire transforme le QR code en expérience.</h1>
              <p>
                Vistaire aide les restaurants haut de gamme à présenter leur
                carte dans une expérience mobile élégante : menu clair, fiches
                plats visuelles, allergènes, prix et 3D/AR sélective.
              </p>
            </div>
          </article>

          <article className={`${styles.card} ${styles.plateCard}`}>
            <FramerImage
              alt="Plat de homard présenté dans une assiette noire"
              className={styles.cardImage}
              priority
              src={lobsterPlate}
            />
            <div aria-hidden="true" className={styles.imageShade} />
            <Link
              className={`${styles.ctaButton} ${styles.plateButton}`}
              href={routes.appointment}
              prefetch={false}
            >
              Prendre rendez-vous
              <ArrowIcon />
            </Link>
          </article>

          <article
            aria-labelledby="about-mobile-card-title"
            className={`${styles.card} ${styles.mobileCard}`}
          >
            <FramerImage
              alt="Téléphone affichant une carte Vistaire à côté d'un QR code de table"
              className={styles.cardImage}
              priority
              src={mobileQrTable}
            />
            <div aria-hidden="true" className={styles.mobileShade} />
            <div className={styles.mobileCopy}>
              <div aria-hidden="true" className={styles.ornaments}>
                <span>✽</span>
                <span>✽</span>
                <span>✽</span>
              </div>
              <h2 id="about-mobile-card-title">
                CARTE MOBILE
                <span>PREMIUM</span>
              </h2>
              <p>Pensée pour le service à table</p>
            </div>
          </article>

          <article className={`${styles.card} ${styles.guestCard}`}>
            <FramerImage
              alt="Client consultant une carte digitale Vistaire dans un restaurant premium"
              className={styles.cardImage}
              src={restaurantGuest}
            />
            <div aria-hidden="true" className={styles.guestShade} />
            <Link
              className={`${styles.ctaButton} ${styles.guestButton}`}
              href="#vision"
              prefetch={false}
            >
              Découvrir Vistaire
              <ArrowIcon />
            </Link>
          </article>

          <article className={`${styles.card} ${styles.visionCard}`} id="vision">
            <div aria-hidden="true" className={styles.visionShade} />
            <div className={styles.visionCopy}>
              <p className={styles.badge}>Notre Vision</p>
              <p>
                Le digital doit prolonger l&apos;expérience du restaurant, pas
                la remplacer. Vistaire garde le plat au centre : une carte
                claire, visuelle et mobile-first, conçue pour donner envie sans
                transformer la salle en application froide.
              </p>
              <p className={styles.values}>
                Mobile-First <span>·</span> 3D Sélective <span>·</span> Sans
                Application
              </p>
            </div>
          </article>
        </div>

        <PreviewNav activeSection="about" routeMode={routeMode} />
      </section>

      <PreviewFooter routeMode={routeMode} />
    </main>
  );
}
