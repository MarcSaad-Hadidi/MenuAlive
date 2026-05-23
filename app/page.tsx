import type { Metadata } from "next";
import { DemoRequestSection } from "@/components/DemoRequestSection";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { ResponsiveLandingHero } from "@/components/landing/ResponsiveLandingHero";
import {
  DEFAULT_SITE_DESCRIPTION,
  absoluteUrl,
  buildVistaireServiceJsonLd,
  buildWebPageJsonLd
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Menu digital QR premium pour restaurants",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    url: absoluteUrl("/"),
    title: "Vistaire — Menu digital QR premium pour restaurants",
    description: DEFAULT_SITE_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: "Vistaire — Menu digital QR premium pour restaurants",
    description: DEFAULT_SITE_DESCRIPTION
  }
};

const claritySteps = [
  {
    title: "Le problème",
    body: "Les QR menus classiques ressemblent trop souvent à des PDF froids : la carte existe, mais l’image de la maison disparaît."
  },
  {
    title: "La solution Vistaire",
    body: "Le scan ouvre une carte digitale rapide, visuelle et pensée mobile-first, avec les détails utiles dès la première lecture."
  },
  {
    title: "Les signatures",
    body: "La 3D/AR reste sélective : elle accompagne les plats qui gagnent à être vus en volume, sans alourdir toute la carte."
  },
  {
    title: "La lecture restaurant",
    body: "L’aperçu restaurateur montre les plats consultés, les recherches, les vues immersives et les moments d’activité."
  }
];

const benefits = [
  {
    title: "Image de marque tenue",
    body: "Le menu digital reste cohérent avec votre salle, vos plats et le niveau d’attention attendu à table."
  },
  {
    title: "Carte mieux comprise",
    body: "Photos, allergènes, accords et récits courts aident le convive à lire la carte sans friction."
  },
  {
    title: "Signaux utiles",
    body: "Côté restaurant, Vistaire aide à repérer ce qui retient l’attention sans prétendre mesurer ce que la carte ne mesure pas."
  }
];

function ClaritySection() {
  return (
    <section
      id="clarte"
      className="relative overflow-hidden border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-champagne/85">
          Du PDF froid à la carte digitale
        </p>
        <h2 className="mt-5 max-w-5xl font-display text-[clamp(2.25rem,5.2vw,5.1rem)] font-normal leading-[1] text-cream">
          Remplacez le QR menu classique par une carte mobile digne de votre salle.
        </h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#d1c2aa] sm:text-lg sm:leading-8">
          Vistaire garde la simplicité du QR code, puis ajoute ce qu’un PDF ne
          porte pas : des fiches plats claires, une présentation visuelle, une
          3D/AR utile pour certaines signatures et une lecture côté restaurant.
        </p>

        <div className="mt-12 grid gap-8 border-t border-white/12 pt-9 md:grid-cols-2 lg:grid-cols-4">
          {claritySteps.map((step, index) => (
            <article key={step.title} className="max-w-sm lg:pr-5">
              <p className="mb-5 text-xs font-semibold tracking-[0.2em] text-white/28">
                0{index + 1}
              </p>
              <h3 className="text-lg font-semibold text-champagne">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-6 text-[#b9aa94]">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section
      id="benefices"
      className="relative overflow-hidden bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne/35 to-transparent" />
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-champagne/85">
          Bénéfices restaurant
        </p>
        <h2 className="mt-5 max-w-5xl font-display text-[clamp(2.45rem,6vw,5.8rem)] font-normal leading-[0.98] text-cream">
          Votre carte devient plus lisible, plus fidèle, plus facile à valoriser.
        </h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#d1c2aa] sm:text-lg sm:leading-8">
          Vistaire se concentre sur le moment où le convive consulte la carte :
          une lecture mobile immédiate, des fiches plats élégantes, la 3D/AR
          quand elle apporte quelque chose, et une vue claire des signaux
          d&apos;attention autour de votre menu.
        </p>

        <div className="mt-12 grid gap-8 border-t border-white/12 pt-9 md:grid-cols-3 lg:mt-16 lg:pt-11">
          {benefits.map((benefit, index) => (
            <article key={benefit.title} className="max-w-sm md:pr-8">
              <p className="mb-5 text-xs font-semibold tracking-[0.2em] text-white/28">
                0{index + 1}
              </p>
              <h3 className="text-xl font-semibold text-champagne">
                {benefit.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-[#d1c2aa]">
                {benefit.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <JsonLd
        data={[
          buildWebPageJsonLd({
            path: "/",
            name: "Vistaire — Menu digital QR premium pour restaurants",
            description: DEFAULT_SITE_DESCRIPTION
          }),
          buildVistaireServiceJsonLd()
        ]}
      />
      <main>
        <ResponsiveLandingHero />
        <ClaritySection />
        <BenefitsSection />
        <DemoRequestSection />
      </main>
      <SiteFooter />
    </>
  );
}
