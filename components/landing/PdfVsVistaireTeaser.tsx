import Link from "next/link";
import { PrimaryButton } from "@/components/PrimaryButton";

const contrasts = [
  {
    pdf: "Fichier statique à zoomer sur mobile",
    vistaire: "Carte mobile structurée, lisible à table"
  },
  {
    pdf: "Plats signatures noyés dans une page",
    vistaire: "Fiches plats avec photo, détails et allergènes"
  },
  {
    pdf: "Image de marque affaiblie à table",
    vistaire: "Expérience premium cohérente avec votre salle"
  }
];

export function PdfVsVistaireTeaser() {
  return (
    <section
      id="pdf-vs-digital"
      className="relative border-t border-white/10 bg-[#0a0706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(120,45,30,0.12),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d4846a]">
          PDF vs Vistaire
        </p>
        <h2 className="mt-5 max-w-4xl font-display text-[clamp(2.2rem,5vw,4.5rem)] font-normal leading-[1.02] text-cream">
          Un PDF n&apos;est pas un menu digital.
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[#d1c2aa] sm:text-lg">
          Beaucoup de restaurants mettent un PDF derrière le QR code. Le client
          subit une lecture difficile — Vistaire transforme ce moment en
          expérience premium.
        </p>

        <div className="mt-10 space-y-3">
          {contrasts.map((row) => (
            <div
              key={row.pdf}
              className="grid gap-3 rounded-lg border border-white/10 bg-[#0d0907] p-4 sm:grid-cols-2 sm:gap-6 sm:p-5"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  PDF
                </p>
                <p className="mt-2 text-sm leading-6 text-[#9a8a78]">{row.pdf}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-champagne/70">
                  Vistaire
                </p>
                <p className="mt-2 text-sm leading-6 text-[#eadcc6]">{row.vistaire}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <PrimaryButton href="/demo">Voir la démo Vistaire</PrimaryButton>
          <Link
            href="/menu-pdf-vs-menu-digital"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#5c2a1f]/40 px-6 text-sm font-semibold text-[#d4846a] transition hover:border-[#8b3a28]/60 hover:text-[#f0c4b4] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          >
            Comparer PDF vs menu digital
          </Link>
        </div>
      </div>
    </section>
  );
}
