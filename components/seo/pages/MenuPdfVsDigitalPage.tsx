import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SeoComparisonTable } from "@/components/seo/SeoComparisonTable";
import { SeoFaq } from "@/components/seo/SeoFaq";
import { SeoTakeaway } from "@/components/seo/SeoTakeaway";
import { buildSeoPillarJsonLd } from "@/lib/seoPillarJsonLd";
import type { SeoPageData } from "@/lib/seoPages";

function SecondaryButton({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 px-6 py-3 text-center text-sm font-semibold text-[#eadcc6] transition hover:border-champagne/40 hover:bg-white/[0.04] hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
    >
      {children}
    </Link>
  );
}

export function MenuPdfVsDigitalPage({ page }: { page: SeoPageData }) {
  return (
    <>
      <JsonLd data={buildSeoPillarJsonLd(page)} />
      <main>
        <section className="relative overflow-hidden border-b border-[#3d2018]/40 bg-[#0a0605] px-5 pb-16 pt-32 sm:px-10 lg:px-16 lg:pb-24">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(120,45,30,0.22),transparent_60%)]"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d4846a]">
                {page.eyebrow}
              </p>
              <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.8rem,8vw,6.5rem)] font-normal leading-[0.92] text-cream">
                {page.h1}
              </h1>
              <div className="mt-7 max-w-2xl space-y-4 border-l-2 border-[#8b3a28]/60 pl-5 text-base leading-7 text-[#f0e3cf] sm:text-lg">
                {page.answer.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-8 max-w-2xl">
                <SeoTakeaway
                  heading={page.takeaway.heading}
                  text={page.takeaway.text}
                  variant="confrontation"
                />
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
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-[#5c2a1f]/30 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <Image
                src={page.visualImage.src}
                alt={page.visualImage.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
                priority
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#0a0605] via-transparent to-transparent"
                aria-hidden
              />
            </div>
          </div>
        </section>

        <section className="bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 className="max-w-4xl font-display text-4xl font-normal leading-[0.98] text-cream sm:text-5xl lg:text-6xl">
              {page.comparison.heading}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#cdbfa9]">
              Ce que le client subit avec un PDF, et ce que Vistaire transforme
              à table.
            </p>
            <div className="mt-10">
              <SeoComparisonTable comparison={page.comparison} tone="confrontation" />
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            {page.sections.map((section, index) => (
              <article
                key={section.heading}
                className={`rounded-lg border p-6 sm:p-8 ${
                  index === 0
                    ? "border-[#5c2a1f]/25 bg-[#120908]"
                    : "border-champagne/20 bg-[#0d0a08]"
                }`}
              >
                <h2 className="font-display text-3xl font-normal leading-tight text-cream sm:text-4xl">
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
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4846a]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SeoFaq faqs={page.faq} />
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
