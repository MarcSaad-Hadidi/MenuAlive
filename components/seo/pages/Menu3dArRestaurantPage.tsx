import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SeoFaq } from "@/components/seo/SeoFaq";
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

export function Menu3dArRestaurantPage({ page }: { page: SeoPageData }) {
  return (
    <>
      <JsonLd data={buildSeoPillarJsonLd(page)} />
      <main>
        <section className="relative flex min-h-[70svh] items-end overflow-hidden bg-[#050403] px-5 pb-16 pt-32 sm:px-10 lg:px-16">
          <Image
            src={page.visualImage.src}
            alt={page.visualImage.alt}
            fill
            sizes="100vw"
            className="object-cover opacity-50"
            priority
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,3,0.5),rgba(5,4,3,0.92)_55%,rgba(5,4,3,1))]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-champagne/90">
              {page.eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.6rem,8vw,6rem)] font-normal leading-[0.94] text-cream">
              {page.h1}
            </h1>
            <div className="mt-7 max-w-3xl space-y-4 text-base leading-7 text-[#e8dcc8] sm:text-lg">
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

        <section className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <article className="rounded-lg border border-emerald-900/30 bg-[#0a0d0a] p-6 sm:p-8">
              <h2 className="font-display text-3xl font-normal text-cream">
                Quand utiliser la 3D
              </h2>
              <ul className="mt-6 space-y-4">
                {page.sections[0]?.points?.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 text-sm leading-7 text-[#c8dcc8] sm:text-base"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600/70" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-3 text-sm leading-7 text-[#a8b8a8]">
                {page.sections[0]?.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
            <article className="rounded-lg border border-white/10 bg-[#0d0907] p-6 sm:p-8">
              <h2 className="font-display text-3xl font-normal text-cream">
                Quand s&apos;en passer
              </h2>
              <ul className="mt-6 space-y-4">
                {[
                  "Entrées simples déjà claires en photo",
                  "Boissons et classiques sans enjeu visuel",
                  "Plats où la 3D alourdit sans clarifier"
                ].map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 text-sm leading-7 text-[#cdbfa9] sm:text-base"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/25" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-3 text-sm leading-7 text-[#b9aa94]">
                {page.sections[1]?.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-4xl font-normal text-cream sm:text-5xl">
              {page.comparison.heading}
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {page.comparison.rows.map((row) => (
                <article
                  key={row.label}
                  className="rounded-lg border border-white/10 bg-[#0d0907] p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-champagne/70">
                    {row.label}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-[#b7a891]">{row.before}</p>
                  <p className="mt-4 border-t border-white/8 pt-4 text-sm leading-6 text-[#eadcc6]">
                    {row.after}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SeoFaq faqs={page.faq} />
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <InternalSeoLinks currentSlug={page.slug} />
          </div>
        </section>
      </main>
    </>
  );
}
