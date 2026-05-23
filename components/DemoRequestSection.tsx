import Link from "next/link";
import { PrimaryButton } from "@/components/PrimaryButton";

const highlights = [
  {
    title: "La carte côté convive",
    body: "Une carte mobile rapide à parcourir, avec photos, allergènes, accords et fiches plats claires."
  },
  {
    title: "La 3D/AR utile",
    body: "Quelques signatures peuvent être vues en volume quand cela apporte une vraie compréhension du plat."
  },
  {
    title: "La lecture restaurateur",
    body: "Plats consultés, recherches et vues immersives montrent les signaux d’attention autour de la carte."
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
            Maison Élyse · démonstration fictive
          </p>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,5vw,5.2rem)] font-normal leading-[1.01] text-cream">
            Parcourez la carte démo Maison Élyse comme un convive à table.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#d1c2aa] sm:text-lg sm:leading-8">
            Maison Élyse est un restaurant fictif de démonstration, pas une
            référence client réelle : un parcours conçu pour montrer Vistaire en
            situation, de la carte côté convive à la vue restaurateur.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#b9aa94] sm:text-base">
            Ouvrez la carte mobile, explorez une fiche avec 3D quand elle est
            disponible, puis passez côté restaurant pour lire les plats consultés,
            les recherches et les vues immersives.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <PrimaryButton href="/demo" className="justify-center sm:w-auto">
              Voir la carte démo
            </PrimaryButton>
            <Link
              href="/admin"
              className="inline-flex min-h-12 max-w-full items-center justify-center rounded-full border border-white/14 px-6 text-center text-sm font-semibold leading-tight text-[#cdbfa9] transition hover:border-champagne/35 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              Voir l’aperçu restaurateur démo
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
