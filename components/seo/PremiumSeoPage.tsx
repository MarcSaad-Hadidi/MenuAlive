import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  buildBreadcrumbJsonLd,
  buildPageServiceJsonLd,
  buildWebPageJsonLd
} from "@/lib/seo";
import { getRelatedSeoPages, type SeoPageData } from "@/lib/seoPages";

type PremiumSeoPageProps = {
  page: SeoPageData;
};

function SecondaryButton({
  href,
  children
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 px-6 py-3 text-center text-sm font-semibold text-[#eadcc6] transition hover:border-champagne/40 hover:bg-white/[0.04] hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
    >
      {children}
    </Link>
  );
}

function PageHero({ page }: PremiumSeoPageProps) {
  return (
    <section className="relative flex min-h-[76svh] items-end overflow-hidden bg-[#080706] px-5 pb-16 pt-32 sm:px-10 lg:px-16 lg:pb-20">
      <Image
        src={page.visualImage.src}
        alt=""
        fill
        sizes="100vw"
        priority
        className="object-cover"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,6,0.34),rgba(8,7,6,0.74)_48%,rgba(8,7,6,0.96)),linear-gradient(90deg,rgba(8,7,6,0.92),rgba(8,7,6,0.56)_54%,rgba(8,7,6,0.2))]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-champagne/90">
          {page.eyebrow}
        </p>
        <h1 className="mt-5 max-w-5xl font-display text-[clamp(3rem,9vw,7.25rem)] font-normal leading-[0.94] text-cream">
          {page.h1}
        </h1>
        <div className="mt-7 max-w-3xl space-y-4 text-base leading-7 text-[#f0e3cf] sm:text-lg sm:leading-8">
          {page.answer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <PrimaryButton href={page.primaryCta.href}>
            {page.primaryCta.label}
          </PrimaryButton>
          {page.secondaryCta ? (
            <SecondaryButton href={page.secondaryCta.href}>
              {page.secondaryCta.label}
            </SecondaryButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function NarrativeSections({ page }: PremiumSeoPageProps) {
  return (
    <section className="border-t border-white/10 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
        {page.sections.map((section, index) => (
          <article
            key={section.heading}
            className="rounded-lg border border-white/10 bg-[#0d0907] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] sm:p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne/70">
              0{index + 1}
            </p>
            <h2 className="mt-4 font-display text-3xl font-normal leading-[1.04] text-cream sm:text-4xl lg:text-5xl">
              {section.heading}
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#cdbfa9] sm:text-base">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.points ? (
              <ul className="mt-6 space-y-3">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-6 text-[#eadcc6]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function ComparisonSection({ page }: PremiumSeoPageProps) {
  return (
    <section className="border-t border-white/10 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-4xl font-display text-4xl font-normal leading-[0.98] text-cream sm:text-5xl lg:text-7xl">
          {page.comparison.heading}
        </h2>
        <div className="mt-9 overflow-hidden rounded-lg border border-white/10 bg-[#0c0907]">
          <div className="hidden grid-cols-[0.5fr_1fr_1fr] border-b border-white/10 bg-white/[0.035] text-xs font-semibold uppercase tracking-[0.16em] text-champagne/80 md:grid">
            <div className="px-5 py-4">Critère</div>
            <div className="border-l border-white/10 px-5 py-4">
              {page.comparison.beforeLabel}
            </div>
            <div className="border-l border-white/10 px-5 py-4">
              {page.comparison.afterLabel}
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {page.comparison.rows.map((row) => (
              <div
                key={row.label}
                className="grid gap-4 p-5 md:grid-cols-[0.5fr_1fr_1fr] md:gap-0 md:p-0"
              >
                <div className="font-semibold text-champagne md:px-5 md:py-5">
                  {row.label}
                </div>
                <div className="text-sm leading-6 text-[#b7a891] md:border-l md:border-white/10 md:px-5 md:py-5">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/36 md:hidden">
                    {page.comparison.beforeLabel}
                  </span>
                  {row.before}
                </div>
                <div className="text-sm leading-6 text-[#eadcc6] md:border-l md:border-white/10 md:px-5 md:py-5">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-champagne/70 md:hidden">
                    {page.comparison.afterLabel}
                  </span>
                  {row.after}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ page }: PremiumSeoPageProps) {
  return (
    <section className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <h2 className="font-display text-4xl font-normal leading-[1] text-cream sm:text-5xl lg:text-6xl">
            Questions fréquentes
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#cdbfa9]">
            Des réponses volontairement concrètes, sans chiffres inventés ni
            promesses de performance commerciale.
          </p>
        </div>
        <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-[#0d0907]">
          {page.faq.map((item) => (
            <article key={item.question} className="p-5 sm:p-6">
              <h3 className="font-display text-xl leading-tight text-cream">
                {item.question}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#cdbfa9]">
                {item.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedLinks({ page }: PremiumSeoPageProps) {
  const relatedPages = getRelatedSeoPages(page.slug);

  return (
    <section className="border-t border-white/10 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-3xl font-normal leading-tight text-cream sm:text-4xl lg:text-5xl">
          Continuer le parcours Vistaire
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {relatedPages.map((relatedPage) => (
            <Link
              key={relatedPage.path}
              href={relatedPage.path}
              className="group rounded-lg border border-white/10 bg-[#0d0907] p-5 transition hover:border-champagne/35 hover:bg-[#120d09] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <h3 className="font-display text-xl leading-tight text-cream group-hover:text-champagne">
                {relatedPage.h1}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#a99984]">
                {relatedPage.metadataDescription}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ page }: PremiumSeoPageProps) {
  return (
    <section className="border-t border-white/10 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <h2 className="font-display text-4xl font-normal leading-[0.98] text-cream sm:text-5xl lg:text-7xl">
            Voir Vistaire comme un restaurateur le verrait.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#d8c9b2] sm:text-lg">
            La meilleure vérification reste concrète : ouvrir la carte exemple,
            consulter une fiche plat, puis regarder ce que l&apos;aperçu restaurateur
            raconte de l&apos;attention client.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <PrimaryButton href={page.primaryCta.href}>
              {page.primaryCta.label}
            </PrimaryButton>
            {page.secondaryCta ? (
              <SecondaryButton href={page.secondaryCta.href}>
                {page.secondaryCta.label}
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PremiumSeoPage({ page }: PremiumSeoPageProps) {
  const jsonLd = [
    buildWebPageJsonLd({
      path: page.path,
      name: page.metadataTitle,
      description: page.metadataDescription
    }),
    buildBreadcrumbJsonLd([
      { name: "Accueil", path: "/" },
      { name: page.h1, path: page.path }
    ]),
    buildPageServiceJsonLd({
      path: page.path,
      ...page.service
    })
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <main>
        <PageHero page={page} />
        <NarrativeSections page={page} />
        <ComparisonSection page={page} />
        <FaqSection page={page} />
        <RelatedLinks page={page} />
        <FinalCta page={page} />
      </main>
    </>
  );
}
