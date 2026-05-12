import Link from "next/link";
import { PrimaryButton } from "@/components/PrimaryButton";

const highlights = [
  {
    title: "Une carte plus lisible",
    body: "Les plats, allergènes et options restent faciles à parcourir pendant le service."
  },
  {
    title: "Des signatures mieux valorisées",
    body: "Chaque fiche met en scène l’image, le récit et les détails utiles du plat."
  },
  {
    title: "Une expérience sans application",
    body: "Le QR code ouvre immédiatement le menu vivant, avec 3D / AR quand le plat s’y prête."
  }
];

export function DemoRequestSection() {
  return (
    <section
      id="demo"
      className="relative overflow-hidden border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-champagne/85">
            À présenter à table
          </p>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,5vw,5.2rem)] font-normal leading-[1.01] text-cream">
            Une expérience pensée pour élever votre carte.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#d1c2aa] sm:text-lg sm:leading-8">
            Vistaire transforme le QR code en moment visuel, rapide et mémorable,
            fidèle à vos plats, à votre salle et à votre rythme de service.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <PrimaryButton href="/demo" className="justify-center sm:w-auto">
              Explorer Maison Élyse
            </PrimaryButton>
            <Link
              href="/admin"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 px-6 text-center text-sm font-semibold text-[#cdbfa9] transition hover:border-champagne/35 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              Aperçu restaurateur
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-6 border-t border-white/12 pt-8 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="max-w-sm md:pr-6">
              <h3 className="text-lg font-semibold text-champagne">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#b9aa94]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
