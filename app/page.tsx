import Link from "next/link";
import type { Metadata } from "next";
import { DemoRequestSection } from "@/components/DemoRequestSection";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { GuidesVistaireSection } from "@/components/landing/GuidesVistaireSection";
import { PdfVsVistaireTeaser } from "@/components/landing/PdfVsVistaireTeaser";
import { ProductJourneySection } from "@/components/landing/ProductJourneySection";
import { ResponsiveLandingHero } from "@/components/landing/ResponsiveLandingHero";
import { SeoFooter } from "@/components/seo/SeoFooter";
import {
  DEFAULT_SITE_DESCRIPTION,
  absoluteUrl,
  buildVistaireServiceJsonLd,
  buildWebPageJsonLd
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Menu digital QR premium pour restaurants haut de gamme",
  description: DEFAULT_SITE_DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    url: absoluteUrl("/"),
    title: "Vistaire — Menu digital QR premium pour restaurants haut de gamme",
    description: DEFAULT_SITE_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: "Vistaire — Menu digital QR premium pour restaurants haut de gamme",
    description: DEFAULT_SITE_DESCRIPTION
  }
};

const benefits = [
  {
    title: "Valeur perçue",
    body: "Des fiches plats qui rendent vos signatures plus désirables à table."
  },
  {
    title: "Clarté client",
    body: "Allergènes, options et prix lisibles sans zoom ni fichier statique."
  },
  {
    title: "Image premium",
    body: "Une carte cohérente avec un restaurant haut de gamme — pas un PDF utilitaire."
  }
];

function RestaurantValueSection() {
  return (
    <section
      id="benefices"
      className="relative overflow-hidden bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne/35 to-transparent" />
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-champagne/85">
          Valeur restaurant
        </p>
        <h2 className="mt-5 max-w-5xl font-display text-[clamp(2.45rem,6vw,5.8rem)] font-normal leading-[0.98] text-cream">
          Une carte plus claire pour vos clients. Une image plus forte pour votre
          restaurant.
        </h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#d1c2aa] sm:text-lg sm:leading-8">
          Vistaire transforme le QR code en carte digitale premium : le client
          parcourt le menu mobile, ouvre des fiches plats visuelles, découvre la
          3D ou l&apos;AR quand elle est pertinente — et vous gardez un aperçu
          restaurateur de l&apos;attention portée à votre carte.
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

        <p className="mt-12 text-sm leading-7 text-[#b9aa94]">
          Besoin de contexte ? Consultez nos guides{" "}
          <Link
            href="/menu-digital-restaurant"
            className="text-champagne underline decoration-champagne/30 underline-offset-4 hover:decoration-champagne/60"
          >
            menu digital
          </Link>
          ,{" "}
          <Link
            href="/menu-qr-code-restaurant"
            className="text-champagne underline decoration-champagne/30 underline-offset-4 hover:decoration-champagne/60"
          >
            QR code restaurant
          </Link>{" "}
          et{" "}
          <Link
            href="/menu-pdf-vs-menu-digital"
            className="text-champagne underline decoration-champagne/30 underline-offset-4 hover:decoration-champagne/60"
          >
            PDF vs digital
          </Link>
          .
        </p>
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
            name: "Vistaire — Menu digital QR premium pour restaurants haut de gamme",
            description: DEFAULT_SITE_DESCRIPTION
          }),
          buildVistaireServiceJsonLd()
        ]}
      />
      <main>
        <ResponsiveLandingHero />
        <RestaurantValueSection />
        <ProductJourneySection />
        <PdfVsVistaireTeaser />
        <GuidesVistaireSection />
        <DemoRequestSection />
      </main>
      <SeoFooter />
    </>
  );
}
