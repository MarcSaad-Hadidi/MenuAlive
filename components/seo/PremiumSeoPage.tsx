import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { JsonLd } from "@/components/JsonLd";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { SeoPageData } from "@/lib/seoPages";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildPageServiceJsonLd,
  buildWebPageJsonLd
} from "@/lib/seo";

type PremiumSeoPageProps = {
  page: SeoPageData;
};

type SeoStyle = CSSProperties & {
  "--seo-index"?: number;
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
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 px-6 py-3 text-center text-sm font-semibold text-[#d8c9b2] transition hover:border-champagne/40 hover:bg-white/[0.035] hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
    >
      {children}
    </Link>
  );
}

function MiniQrMark() {
  return (
    <div
      className="grid h-16 w-16 grid-cols-5 gap-1 rounded-lg border border-[#2c2118] bg-[#efe3cf] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
      aria-hidden="true"
    >
      {Array.from({ length: 25 }, (_, index) => (
        <span
          key={index}
          className={
            [0, 1, 3, 4, 5, 8, 9, 13, 15, 16, 19, 20, 21, 23, 24].includes(
              index
            )
              ? "rounded-[1px] bg-[#15100b]"
              : "rounded-[1px] bg-[#efe3cf]"
          }
        />
      ))}
    </div>
  );
}

function PhonePreview({ page }: { page: SeoPageData }) {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="absolute -inset-3 rounded-[2.2rem] border border-champagne/10 bg-gradient-to-b from-white/[0.06] to-transparent blur-sm" />
      <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-[#141416] bg-[#080706] shadow-[0_34px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08]">
        <div className="absolute left-1/2 top-2 z-20 h-5 w-28 -translate-x-1/2 rounded-full bg-black/88" />
        <div className="relative min-h-[520px] overflow-hidden bg-[#080706] px-4 pb-5 pt-10">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f0b08] p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#17100c]">
              <Image
                src={page.heroImage.src}
                alt={page.heroImage.alt}
                fill
                sizes="320px"
                className="object-cover motion-safe:duration-700 motion-safe:hover:scale-[1.03]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
              <span className="absolute left-3 top-3 rounded-full border border-champagne/40 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-champagne">
                Signature
              </span>
            </div>
            <div className="mt-4">
              <p className="font-display text-xl leading-tight text-cream">
                Homard bleu, bisque corsée
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#b9aa94]">
                Allergène crustacés · fiche plat · vue 3D quand disponible
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d8c9b2]">
            <span className="rounded-full border border-white/10 bg-white/[0.04] py-2">
              Photos
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] py-2">
              Allerg.
            </span>
            <span className="rounded-full border border-champagne/35 bg-champagne/10 py-2 text-champagne">
              3D
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroShowpiece({ page }: { page: SeoPageData }) {
  const isQr = page.heroVariant === "qr";
  const isAr = page.heroVariant === "ar";
  const isPdf = page.heroVariant === "pdf";

  return (
    <div className="relative min-h-[580px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0705] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.34)] sm:p-7 lg:min-h-[620px]">
      <div
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%),linear-gradient(180deg,rgba(217,184,121,0.08),transparent_46%)]"
        aria-hidden="true"
      />
      <div className="seo-scan-line" aria-hidden="true" />

      <div className="relative z-10 flex h-full min-h-[540px] items-center justify-center">
        <PhonePreview page={page} />

        <div
          className={`absolute left-4 top-5 sm:left-6 ${
            isPdf ? "rotate-[-4deg]" : ""
          }`}
        >
          {isPdf ? (
            <div className="w-32 rounded-xl border border-white/12 bg-[#efe3cf] p-3 text-[#18110c] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <p className="font-display text-lg leading-none">PDF</p>
              <div className="mt-3 space-y-2">
                <span className="block h-1.5 w-full rounded bg-[#4c3b2d]/45" />
                <span className="block h-1.5 w-10/12 rounded bg-[#4c3b2d]/30" />
                <span className="block h-1.5 w-11/12 rounded bg-[#4c3b2d]/35" />
                <span className="block h-16 rounded bg-[#4c3b2d]/12" />
              </div>
            </div>
          ) : (
            <MiniQrMark />
          )}
        </div>

        <div className="absolute bottom-6 right-4 max-w-[13rem] rounded-2xl border border-champagne/22 bg-black/45 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur sm:right-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne/85">
            {isQr
              ? "Après le scan"
              : isAr
                ? "Fallback inclus"
                : isPdf
                  ? "Après PDF"
                  : "Parcours client"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#e8dcc8]">
            {isQr
              ? "Le QR code ouvre une carte, pas un fichier à zoomer."
              : isAr
                ? "La fiche reste claire même sans AR compatible."
                : isPdf
                  ? "La carte devient lisible, visuelle et mesurable."
                  : "Scan, carte, fiche plat, immersion quand disponible."}
          </p>
        </div>

        {isAr ? (
          <>
            <span className="seo-orbit seo-orbit-one" aria-hidden="true" />
            <span className="seo-orbit seo-orbit-two" aria-hidden="true" />
          </>
        ) : null}
      </div>
    </div>
  );
}

function PageHero({ page }: { page: SeoPageData }) {
  return (
    <section className="relative overflow-hidden bg-[#080706] px-5 pb-16 pt-32 sm:px-10 lg:px-16 lg:pb-24 lg:pt-36">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_22%),linear-gradient(90deg,rgba(217,184,121,0.08),transparent_26%,transparent_74%,rgba(217,184,121,0.06))]"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center">
        <div className="max-w-4xl">
          <h1 className="font-display text-5xl font-normal leading-[0.94] text-cream sm:text-6xl md:text-7xl lg:text-8xl xl:text-[7.5rem]">
            {page.h1}
          </h1>
          <div className="mt-7 max-w-3xl space-y-4 text-base leading-7 text-[#eadcc6] sm:text-lg sm:leading-8">
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

        <HeroShowpiece page={page} />
      </div>
    </section>
  );
}

function NarrativeSections({ page }: { page: SeoPageData }) {
  return (
    <section className="border-t border-white/10 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 md:grid-cols-2">
          {page.sections.map((section, index) => (
            <article
              key={section.heading}
              className="seo-motion-card rounded-2xl border border-white/10 bg-gradient-to-b from-[#14100d]/88 to-[#090705] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.22)] sm:p-7"
              style={{ "--seo-index": index } as SeoStyle}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne/70">
                0{index + 1}
              </p>
              <h2 className="mt-4 font-display text-3xl font-normal leading-[1.03] text-cream sm:text-4xl lg:text-5xl">
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
                    <li
                      key={point}
                      className="flex gap-3 text-sm leading-6 text-[#eadcc6]"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisualJourney({ page }: { page: SeoPageData }) {
  return (
    <section className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="font-display text-4xl font-normal leading-[0.98] text-cream sm:text-5xl lg:text-7xl">
            {page.visual.heading}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#cdbfa9] sm:text-lg sm:leading-8">
            {page.visual.body}
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute left-[1.05rem] top-4 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-champagne/70 via-white/12 to-transparent sm:block"
            aria-hidden="true"
          />
          <div className="space-y-4">
            {page.visual.steps.map((step, index) => (
              <article
                key={step.title}
                className="seo-motion-card relative rounded-2xl border border-white/10 bg-[#100c09] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.22)] sm:ml-12 sm:p-6"
                style={{ "--seo-index": index } as SeoStyle}
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-champagne/35 bg-champagne/10 font-display text-lg text-champagne sm:absolute sm:-left-[4.3rem] sm:top-5">
                  {index + 1}
                </span>
                <h3 className="font-display text-2xl leading-tight text-cream">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#cdbfa9] sm:text-base">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection({ page }: { page: SeoPageData }) {
  return (
    <section className="border-t border-white/10 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <h2 className="font-display text-4xl font-normal leading-[0.98] text-cream sm:text-5xl lg:text-7xl">
            {page.comparison.heading}
          </h2>
          <p className="mt-6 text-base leading-7 text-[#cdbfa9] sm:text-lg sm:leading-8">
            {page.comparison.body}
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0907] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div className="hidden grid-cols-[0.55fr_1fr_1fr] border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-[0.16em] text-champagne/80 md:grid">
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
                className="grid gap-4 p-5 md:grid-cols-[0.55fr_1fr_1fr] md:gap-0 md:p-0"
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

function FaqSection({ page }: { page: SeoPageData }) {
  return (
    <section className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <h2 className="font-display text-4xl font-normal leading-[1] text-cream sm:text-5xl lg:text-7xl">
            Questions que se pose un restaurateur
          </h2>
          <p className="mt-5 text-base leading-7 text-[#cdbfa9]">
            Les réponses restent volontairement concrètes: pas de promesse
            universelle, pas de faux avis, pas de chiffre inventé.
          </p>
        </div>

        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0d0907]">
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

function RelatedLinks({ page }: { page: SeoPageData }) {
  return (
    <section className="border-t border-white/10 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-3xl font-normal leading-tight text-cream sm:text-4xl lg:text-5xl">
          Continuer le parcours Vistaire
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {page.relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-white/10 bg-[#0d0907] p-5 transition hover:border-champagne/35 hover:bg-[#120d09] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <h3 className="font-display text-xl leading-tight text-cream group-hover:text-champagne">
                {link.label}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#a99984]">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ page }: { page: SeoPageData }) {
  return (
    <section className="border-t border-white/10 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-champagne/20 bg-gradient-to-br from-[#18110c] via-[#0b0806] to-[#050403] p-7 shadow-[0_30px_110px_rgba(0,0,0,0.34)] sm:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(217,184,121,0.18),transparent_38%)]"
            aria-hidden="true"
          />
          <div className="relative max-w-4xl">
            <h2 className="font-display text-4xl font-normal leading-[0.98] text-cream sm:text-5xl lg:text-7xl">
              Montrez Vistaire à un vrai restaurateur.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#d8c9b2] sm:text-lg">
              La meilleure vérification reste concrète: ouvrir la carte démo,
              consulter une fiche plat, puis regarder ce que l&apos;aperçu
              restaurateur raconte de l&apos;attention client.
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
    }),
    buildFaqPageJsonLd({
      path: page.path,
      questions: page.faq
    })
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <main>
        <PageHero page={page} />
        <NarrativeSections page={page} />
        <VisualJourney page={page} />
        <ComparisonSection page={page} />
        <FaqSection page={page} />
        <RelatedLinks page={page} />
        <FinalCta page={page} />
      </main>
    </>
  );
}
