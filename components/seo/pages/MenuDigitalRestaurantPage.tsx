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

export function MenuDigitalRestaurantPage({ page }: { page: SeoPageData }) {
  return (
    <>
      <JsonLd data={buildSeoPillarJsonLd(page)} />
      <main>
        <section className="relative min-h-[72svh] bg-[#080706] px-5 pb-20 pt-32 sm:px-10 lg:px-16 lg:pb-28">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne/30 to-transparent" />
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-champagne/80">
                {page.eyebrow}
              </p>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.6rem,7vw,5.8rem)] font-normal leading-[0.96] text-cream">
                {page.h1}
              </h1>
              <div className="mt-8 max-w-2xl space-y-5 text-base leading-8 text-[#d8c9b2] sm:text-lg">
                {page.answer.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <PrimaryButton href={page.primaryCta.href}>
                  {page.primaryCta.label}
                </PrimaryButton>
                {page.secondaryCta ? (
                  <SecondaryButtonLink href={page.secondaryCta.href}>
                    {page.secondaryCta.label}
                  </SecondaryButtonLink>
                ) : null}
              </div>
              <div className="mt-10 max-w-2xl">
                <SeoTakeaway
                  heading={page.takeaway.heading}
                  text={page.takeaway.text}
                  variant="calm"
                />
              </div>
            </div>
            <div className="relative aspect-[5/6] overflow-hidden rounded-sm border border-white/8">
              <Image
                src={page.visualImage.src}
                alt={page.visualImage.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#070504] px-5 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-4xl space-y-24">
            {page.sections.map((section) => (
              <article key={section.heading}>
                <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.02] text-cream">
                  {section.heading}
                </h2>
                <div className="mt-6 space-y-5 text-base leading-8 text-[#cdbfa9]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.points ? (
                  <ul className="mt-8 space-y-4 border-t border-white/8 pt-8">
                    {section.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-4 text-sm leading-7 text-[#eadcc6] sm:text-base"
                      >
                        <span className="mt-2.5 h-px w-8 shrink-0 bg-champagne/50" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-4xl font-normal text-cream sm:text-5xl">
              {page.comparison.heading}
            </h2>
            <div className="mt-10">
              <SeoComparisonTable comparison={page.comparison} />
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SeoFaq faqs={page.faq} />
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <InternalSeoLinks currentSlug={page.slug} />
          </div>
        </section>
      </main>
    </>
  );
}
