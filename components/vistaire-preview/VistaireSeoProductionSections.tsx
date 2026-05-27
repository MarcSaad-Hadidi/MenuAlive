import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { SeoFaq } from "@/components/seo/SeoFaq";
import type { SeoPageData } from "@/lib/seoPages";

export function VistaireSeoProductionSections({
  page
}: {
  page: SeoPageData;
}) {
  return (
    <section className="relative z-[2] border-y border-[#f6e1b7]/15 bg-[#050302]/82 px-5 py-16 text-[#fff7ea] sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-14">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8cf9b]/75">
            Guide Vistaire
          </p>
          <h2 className="mt-4 font-display text-3xl font-normal leading-tight text-[#fffaf0] sm:text-4xl">
            Questions et guides pour choisir une carte digitale premium
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#d8c9b2] sm:text-base">
            Des réponses courtes pour restaurateurs, puis les guides reliés
            pour comparer PDF, QR code, menu digital et 3D / AR sélective.
          </p>
        </div>
        <SeoFaq faqs={page.faq} layout="stack" />
        <InternalSeoLinks currentSlug={page.slug} />
      </div>
    </section>
  );
}
