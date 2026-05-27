import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CinematicMenuBloom } from "@/components/seo/animations/CinematicMenuBloom";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { SeoComparisonTable } from "@/components/seo/SeoComparisonTable";
import { SeoFaq } from "@/components/seo/SeoFaq";
import { SeoTakeaway } from "@/components/seo/SeoTakeaway";
import { buildCinematicMenuBloomData } from "@/lib/cinematicMenuBloomData";
import { buildSeoPillarJsonLd } from "@/lib/seoPillarJsonLd";
import type { SeoPageData } from "@/lib/seoPages";

const guestBenefits = [
  "Lecture claire des catégories sans pincer pour zoomer.",
  "Fiches plats désirables avec visuels, prix et descriptions.",
  "Allergènes, options et accords accessibles au bon moment.",
  "Plats signatures mis en avant sans surcharger la carte."
];

const houseBenefits = [
  "Image cohérente avec la salle et l'identité du restaurant.",
  "Signatures valorisées dans la hiérarchie de la carte.",
  "Présentation uniforme entre service papier et carte mobile.",
  "Aperçu restaurateur sobre pour suivre la vie de la carte."
];

const bloomMomentLabels = [
  "Carte papier posée sur la table",
  "Lumière champagne qui balaye la carte",
  "L'écran mobile prend la place du papier",
  "Catégories qui s'ordonnent une à une",
  "Plat signature qui prend la pleine fiche",
  "Allergènes, option et accord du chef",
  "Badge discret pour la 3D sélective"
];

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

function HeroSignaturePreview({
  src,
  alt
}: {
  src: string;
  alt: string;
}) {
  return (
    <figure className="relative mx-auto max-w-sm lg:max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_30%,rgba(217,184,121,0.18),transparent_62%)]"
      />
      <div className="relative overflow-hidden rounded-2xl border border-champagne/25 bg-gradient-to-b from-[#1d140d] to-[#0b0705] shadow-[0_28px_80px_rgba(0,0,0,0.42),0_0_70px_rgba(217,184,121,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="relative aspect-[5/4] overflow-hidden">
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 440px"
            className="object-cover"
            style={{ objectPosition: "center 42%" }}
            quality={90}
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded border border-champagne/45 bg-[#1a1008]/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
            <span
              aria-hidden
              className="h-1 w-1 rounded-full bg-champagne/90"
            />
            Signature
          </span>
          <span className="absolute right-3 top-3 rounded border border-white/16 bg-[#1a1008]/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-cream/90">
            Maison Élyse
          </span>
        </div>
        <div className="space-y-1.5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-base leading-tight text-cream">
              Homard bleu, bisque corsée &amp; fenouil
            </p>
            <p className="shrink-0 font-display text-base tabular-nums leading-tight text-champagne">
              104 $
            </p>
          </div>
          <p className="text-[12px] leading-relaxed text-[#b9aa94]">
            Aperçu d&apos;une fiche plat Vistaire. La carte se construit en
            détail dans la séquence ci-dessous.
          </p>
        </div>
      </div>
    </figure>
  );
}

function StoryCard({
  heading,
  body,
  points
}: {
  heading: string;
  body: string[];
  points?: string[];
}) {
  return (
    <article>
      <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.04] text-cream">
        {heading}
      </h2>
      <div className="mt-6 space-y-5 text-base leading-8 text-[#cdbfa9]">
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {points ? (
        <ul className="mt-8 space-y-4 border-t border-white/8 pt-8">
          {points.map((point) => (
            <li
              key={point}
              className="flex gap-4 text-sm leading-7 text-[#eadcc6] sm:text-base"
            >
              <span
                aria-hidden
                className="mt-2.5 h-px w-8 shrink-0 bg-champagne/50"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function BenefitColumn({
  title,
  intro,
  items,
  accent
}: {
  title: string;
  intro: string;
  items: ReadonlyArray<string>;
  accent: "warm" | "calm";
}) {
  const accentClass =
    accent === "warm"
      ? "border-champagne/25 bg-[#0d0a08]"
      : "border-white/[0.08] bg-[#0a0807]";
  return (
    <article className={`rounded-2xl border p-6 sm:p-8 ${accentClass}`}>
      <h3 className="font-display text-2xl font-normal leading-tight text-cream sm:text-3xl">
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-[#cdbfa9] sm:text-base">
        {intro}
      </p>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-6 text-[#eadcc6]"
          >
            <span
              aria-hidden
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne/70"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function MenuDigitalRestaurantPage({ page }: { page: SeoPageData }) {
  const bloomPreview = buildCinematicMenuBloomData();

  return (
    <>
      <JsonLd data={buildSeoPillarJsonLd(page)} />
      <main>
        <section className="relative overflow-hidden bg-[#080706] px-5 pb-20 pt-32 sm:px-10 lg:px-16 lg:pb-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne/30 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_15%_0%,rgba(217,184,121,0.14),transparent_60%)]"
          />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.85fr] lg:items-center">
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
                  <SecondaryButton href={page.secondaryCta.href}>
                    {page.secondaryCta.label}
                  </SecondaryButton>
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
            <div className="relative">
              <HeroSignaturePreview
                src={page.visualImage.src}
                alt={page.visualImage.alt}
              />
            </div>
          </div>
        </section>

        <section
          className="relative overflow-hidden border-t border-white/8 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
          aria-labelledby="menu-bloom-heading"
          data-pillar-animation="menu-digital-bloom"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne/25 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_8%,rgba(217,184,121,0.1),transparent_60%)]"
          />
          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-champagne/80">
                Cinematic Menu Bloom
              </p>
              <h2
                id="menu-bloom-heading"
                className="mt-4 font-display text-[clamp(2.1rem,5vw,4rem)] font-normal leading-[1.02] text-cream"
              >
                Une carte qui se construit comme une expérience.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#cdbfa9]">
                La carte papier s&apos;efface, l&apos;écran se révèle, les
                catégories prennent place, le plat signature passe au premier
                plan. Vistaire transforme la lecture du menu en moment
                cinématique premium.
              </p>
            </div>

            <div className="mt-12 lg:mt-16">
              <CinematicMenuBloom preview={bloomPreview} />
            </div>

            <ol
              aria-label="Sept temps de la séquence Cinematic Menu Bloom"
              className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(7,minmax(0,1fr))] lg:gap-2"
            >
              {bloomMomentLabels.map((label, index) => (
                <li
                  key={label}
                  className="rounded-lg border border-white/[0.07] bg-[#0a0807] px-3 py-3 text-left lg:text-center"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-champagne/70">
                    Temps {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-5 text-[#cdbfa9]">
                    {label}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#080706] px-5 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-4xl space-y-24">
            {page.sections.map((section) => (
              <StoryCard
                key={section.heading}
                heading={section.heading}
                body={section.body}
                points={section.points}
              />
            ))}
          </div>
        </section>

        <section
          className="border-t border-white/8 bg-[#050403] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
          aria-labelledby="menu-benefits-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne/75">
                À table et en cuisine
              </p>
              <h2
                id="menu-benefits-heading"
                className="mt-4 font-display text-4xl font-normal leading-[1.04] text-cream sm:text-5xl"
              >
                Une carte qui sert deux côtés du restaurant.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#cdbfa9]">
                Côté client, une lecture mobile qui reste un plaisir. Côté
                maison, une présentation uniforme qui prolonge la salle, sans
                transformer le service en interface froide.
              </p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <BenefitColumn
                title="Côté client à table"
                intro="Le menu se lit comme une expérience, pas comme un fichier à décrypter au-dessus de l'assiette."
                items={guestBenefits}
                accent="calm"
              />
              <BenefitColumn
                title="Côté maison et service"
                intro="La carte prolonge l'identité de la salle et met les signatures au centre."
                items={houseBenefits}
                accent="warm"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne/75">
              Menu basique ou Vistaire
            </p>
            <h2 className="mt-4 font-display text-4xl font-normal text-cream sm:text-5xl">
              {page.comparison.heading}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#cdbfa9]">
              La différence entre une carte digitale générique et
              l&apos;expérience Vistaire tient surtout à la structure, aux
              fiches plats et à l&apos;immersion sélective.
            </p>
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
