import Image from "next/image";
import Link from "next/link";
import appointmentBackground from "@/Framer/PhotoRestoComplet.png";
import tableImage from "@/Framer/Photo table.png";
import {
  getVistaireChromeRoutes,
  PreviewFooter,
  PreviewNav,
  type VistaireRouteMode
} from "./VistairePreviewChrome";
import { VistaireContactForm } from "./VistaireContactForm";
import styles from "./VistaireRendezVousPreview.module.css";

export function VistaireRendezVousPreview({
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
        src={appointmentBackground}
        unoptimized
      />

      <section
        aria-labelledby="rendez-vous-preview-title"
        className={styles.hero}
        id="rendez-vous-preview"
      >
        <div className={styles.previewFrame}>
          <article className={styles.imagePanel}>
            <Image
              alt="Table de restaurant haut de gamme avec verres, chandelle et QR code Vistaire"
              className={styles.imagePanelPhoto}
              fill
              priority
              quality={100}
              sizes="(max-width: 920px) calc(100vw - 36px), 490px"
              src={tableImage}
              unoptimized
            />
            <div aria-hidden="true" className={styles.imagePanelShade} />
          </article>
          <section className={styles.formPanel} aria-label="Prendre rendez-vous">
            <div aria-hidden="true" className={styles.formPanelShade} />
            <div className={styles.formContent}>
              <p className={styles.kicker}>Parlons de Vistaire</p>
              <h1 id="rendez-vous-preview-title">Prendre rendez-vous</h1>
              <p className={styles.introText}>
                Parlez-nous de votre restaurant, de votre carte et de
                l&apos;exp&eacute;rience que vous souhaitez offrir.
              </p>
              <p className={styles.serviceLine}>
                Restaurants haut de gamme &middot; Montr&eacute;al, Qu&eacute;bec
              </p>

              <VistaireContactForm />

              <div className={styles.directContact} aria-label="Contact direct">
                <span>Contact direct</span>
                <a href="mailto:contact@vistaire.ca">contact@vistaire.ca</a>
              </div>
              <Link
                className={styles.backLink}
                href={routes.contact}
                prefetch={false}
              >
                Retour au contact
              </Link>
            </div>
          </section>
        </div>

        <PreviewNav
          activeSection="contact"
          contactHref={routes.contact}
          routeMode={routeMode}
        />
      </section>

      <PreviewFooter routeMode={routeMode} />
    </main>
  );
}
