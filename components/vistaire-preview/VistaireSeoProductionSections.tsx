import Image from "next/image";
import guideBackground from "@/Framer/PhotoRestoComplet5.png";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { SeoFaq } from "@/components/seo/SeoFaq";
import type { SeoPageData } from "@/lib/seoPages";

export function VistaireSeoProductionSections({
  page
}: {
  page: SeoPageData;
}) {
  return (
    <section
      aria-labelledby={`${page.slug}-seo-guide-title`}
      className="relative z-[2] overflow-hidden border-y border-[#f6e1b7]/15 bg-[#050302] px-5 py-16 text-[#fff7ea] sm:px-8 lg:px-12"
    >
      <Image
        alt=""
        aria-hidden="true"
        className="absolute inset-0 z-0 object-cover"
        fill
        quality={100}
        sizes="100vw"
        src={guideBackground}
        unoptimized
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[#050302]/58"
      />
      <div className="relative z-[2] mx-auto grid max-w-7xl gap-14">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8cf9b]/75">
            Guide Vistaire
          </p>
          <h2
            id={`${page.slug}-seo-guide-title`}
            className="mt-4 font-display text-3xl font-normal leading-tight text-[#fffaf0] sm:text-4xl"
          >
            Guide complet pour choisir une carte digitale premium
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#d8c9b2] sm:text-base">
            Des reperes visibles pour les restaurateurs, avec les reponses, les
            sections de fond, les questions frequentes et les guides relies.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <section
            aria-labelledby={`${page.slug}-direct-answer-title`}
            className="rounded-[8px] border border-[#f6e1b7]/12 bg-[#fff7ea]/[0.035] p-6 sm:p-7"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e8cf9b]/70">
              Reponse directe
            </p>
            <h2
              id={`${page.slug}-direct-answer-title`}
              className="mt-4 font-display text-2xl font-normal leading-tight text-[#fffaf0] sm:text-3xl"
            >
              {page.takeaway.heading}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#d8c9b2] sm:text-base">
              {page.takeaway.text}
            </p>
            <div className="mt-6 grid gap-4 text-sm leading-7 text-[#e6d7c1]">
              {page.answer.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <div className="grid gap-6">
            {page.sections.map((section, index) => (
              <section
                aria-labelledby={`${page.slug}-section-${index}`}
                className="rounded-[8px] border border-[#f6e1b7]/12 bg-[#080604]/70 p-6 sm:p-7"
                key={section.heading}
              >
                <h2
                  id={`${page.slug}-section-${index}`}
                  className="font-display text-2xl font-normal leading-tight text-[#fffaf0]"
                >
                  {section.heading}
                </h2>
                <div className="mt-4 grid gap-4 text-sm leading-7 text-[#d8c9b2] sm:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.points ? (
                  <ul className="mt-5 grid gap-2 text-sm leading-6 text-[#e8cf9b]">
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <SeoFaq faqs={page.faq} layout="stack" />
        <InternalSeoLinks currentSlug={page.slug} />
      </div>
    </section>
  );
}
