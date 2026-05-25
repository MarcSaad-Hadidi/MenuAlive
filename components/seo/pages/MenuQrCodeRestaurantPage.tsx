import Image from "next/image";
import { JsonLd } from "@/components/JsonLd";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButtonLink } from "@/components/SecondaryButtonLink";
import { SeoComparisonTable } from "@/components/seo/SeoComparisonTable";
import { SeoFaq } from "@/components/seo/SeoFaq";
import { SeoTakeaway } from "@/components/seo/SeoTakeaway";
import { buildSeoPillarJsonLd } from "@/lib/seoPillarJsonLd";
import type { SeoPageData } from "@/lib/seoPages";

const journeySteps = [
  { step: "01", label: "Scan QR", detail: "Ouverture instantanée, sans application" },
  { step: "02", label: "Menu mobile", detail: "Catégories et carte lisibles à table" },
  { step: "03", label: "Fiche plat", detail: "Photo, allergènes, prix, détails" },
  { step: "04", label: "Décision", detail: "Le client choisit avec confiance" }
];

export function MenuQrCodeRestaurantPage({ page }: { page: SeoPageData }) {
  return (
    <>
      <JsonLd data={buildSeoPillarJsonLd(page)} />
      <main>
        <section className="bg-[#070504] px-5 pb-12 pt-32 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-champagne/85">
              {page.eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.5rem,7vw,5.5rem)] font-normal leading-[0.98] text-cream">
              {page.h1}
            </h1>
            <div className="mt-6 max-w-2xl space-y-4 text-base leading-7 text-[#d1c2aa] sm:text-lg">
              {page.answer.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-8 max-w-2xl">
              <SeoTakeaway
                heading={page.takeaway.heading}
                text={page.takeaway.text}
                variant="speed"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#0a0807] px-5 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne/70">
              Parcours client
            </p>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {journeySteps.map((item, index) => (
                <li
                  key={item.step}
                  className="glass-card relative rounded-lg p-5"
                >
                  {index < journeySteps.length - 1 ? (
                    <span
                      className="absolute right-0 top-1/2 hidden h-px w-4 translate-x-full bg-champagne/30 lg:block"
                      aria-hidden
                    />
                  ) : null}
                  <p className="text-xs font-semibold tracking-[0.2em] text-champagne/60">
                    {item.step}
                  </p>
                  <p className="mt-2 font-display text-2xl text-cream">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[#b9aa94]">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10">
              <Image
                src={page.visualImage.src}
                alt={page.visualImage.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
            <div className="space-y-10">
              {page.sections.map((section) => (
                <article key={section.heading}>
                  <h2 className="font-display text-3xl font-normal leading-tight text-cream">
                    {section.heading}
                  </h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-[#cdbfa9] sm:text-base">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.points ? (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {section.points.map((point) => (
                        <li
                          key={point}
                          className="glass-badge-champagne rounded-full px-3 py-1.5 text-xs text-[#eadcc6]"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <PrimaryButton href={page.primaryCta.href}>
                  {page.primaryCta.label}
                </PrimaryButton>
                {page.secondaryCta ? (
                  <SecondaryButtonLink href={page.secondaryCta.href}>
                    {page.secondaryCta.label}
                  </SecondaryButtonLink>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-4xl font-normal text-cream">
              {page.comparison.heading}
            </h2>
            <div className="mt-8">
              <SeoComparisonTable comparison={page.comparison} />
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-3xl">
            <SeoFaq faqs={page.faq} layout="stack" />
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <InternalSeoLinks currentSlug={page.slug} />
          </div>
        </section>
      </main>
    </>
  );
}
