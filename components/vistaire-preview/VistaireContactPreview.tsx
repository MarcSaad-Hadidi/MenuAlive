import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import contactBackground from "@/Framer/PhotoRestoComplet4.png";
import cocktailImage from "@/Framer/Boisson.png";
import diningRoomImage from "@/Framer/PhotoResto.png";
import pageContactImage from "@/Framer/PageContact.png";
import lobsterPlate from "@/Framer/PlatHomard.png";
import dessertImage from "@/Framer/Desert.png";
import tableImage from "@/Framer/Photo table.png";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import styles from "./VistaireContactPreview.module.css";

type FramerImageProps = {
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  src: StaticImageData;
};

const imageTiles: FramerImageProps[] = [
  {
    alt: "Salle de restaurant haut de gamme preparee pour le service",
    src: diningRoomImage
  },
  {
    alt: "Plat de homard premium dans une assiette noire",
    src: lobsterPlate
  },
  {
    alt: "Dessert au chocolat servi dans une assiette noire",
    src: dessertImage
  },
  {
    alt: "Table de restaurant elegante avec verres et chandelle",
    src: tableImage
  }
];

function FramerImage({
  alt,
  className,
  priority,
  sizes = "(max-width: 920px) calc(100vw - 36px), 360px",
  src
}: FramerImageProps) {
  return (
    <Image
      alt={alt}
      className={className}
      fill
      priority={priority}
      quality={100}
      sizes={sizes}
      src={src}
      unoptimized
    />
  );
}

export function VistaireContactPreview({
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
        src={contactBackground}
        unoptimized
      />

      <section
        aria-labelledby="contact-preview-title"
        className={styles.hero}
        id="contact-preview"
      >
        <div className={styles.previewFrame}>
          <article className={`${styles.card} ${styles.heroImageCard}`}>
            <FramerImage
              alt="Cocktail rose premium servi dans une coupe sur une scene sombre"
              className={styles.cardImage}
              priority
              sizes="(max-width: 920px) calc(100vw - 36px), 380px"
              src={cocktailImage}
            />
            <div aria-hidden="true" className={styles.heroImageShade} />
            <div className={styles.heroImageCopy}>
              <h1 id="contact-preview-title">
                CONTACT
                <span>VISTAIRE</span>
              </h1>
            </div>
          </article>

          <div className={styles.middleColumn}>
            <article
              aria-labelledby="contact-restaurants-title"
              className={`${styles.card} ${styles.restaurantCard}`}
            >
              <div aria-hidden="true" className={styles.restaurantShade} />
              <div className={styles.restaurantContent}>
                <p className={styles.badge}>POUR LES RESTAURANTS</p>
                <h2 id="contact-restaurants-title" className={styles.srOnly}>
                  Pour les restaurants
                </h2>
                <p>
                  Vistaire transforme le QR code d&apos;un restaurant en carte
                  digitale premium consultable sur mobile, sans application.
                </p>
                <p>
                  Nous pouvons discuter de votre menu, de vos fiches plats, de
                  votre image de marque, de la 3D/AR s&eacute;lective et de
                  l&apos;adaptation &agrave; votre client&egrave;le.
                </p>
                <p>
                  Disponible pour les restaurants de la r&eacute;gion de
                  Montr&eacute;al.
                </p>
              </div>
            </article>

            <div className={styles.tileGrid} aria-label="Ambiance Vistaire">
              {imageTiles.map((tile) => (
                <article className={styles.tileCard} key={tile.alt}>
                  <FramerImage
                    alt={tile.alt}
                    className={styles.cardImage}
                    src={tile.src}
                  />
                </article>
              ))}
            </div>
          </div>

          <div className={styles.rightColumn}>
            <article className={`${styles.card} ${styles.barCard}`}>
              <FramerImage
                alt="Salle Vistaire premium avec banquettes, verres et lumière chaude"
                className={styles.cardImage}
                priority
                src={pageContactImage}
              />
              <div aria-hidden="true" className={styles.barShade} />
            </article>

            <article
              aria-labelledby="contact-card-title"
              className={`${styles.card} ${styles.contactCard}`}
            >
              <div aria-hidden="true" className={styles.contactShade} />
              <div className={styles.contactContent}>
                <Link
                  className={styles.contactButton}
                  href={routes.appointment}
                  prefetch={false}
                >
                  Prendre rendez-vous
                </Link>
                <h2 id="contact-card-title" className={styles.srOnly}>
                  Contact Vistaire
                </h2>
                <p>
                  Parlez-nous de votre restaurant, de votre carte et de
                  l&apos;exp&eacute;rience que vous souhaitez offrir.
                </p>
                <dl className={styles.contactMeta}>
                  <div>
                    <dt>Region</dt>
                    <dd>R&eacute;gion de Montr&eacute;al</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href="mailto:contact@vistaire.ca">
                        contact@vistaire.ca
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </div>

        <PreviewNav activeSection="contact" routeMode={routeMode} />
      </section>

      <PreviewFooter routeMode={routeMode} />
    </main>
  );
}
