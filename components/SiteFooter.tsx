import Link from "next/link";
import { getSeoPages } from "@/lib/seoPages";

const seoLinks = getSeoPages().map((page) => ({
  href: page.path,
  label: page.h1
}));

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050403] px-5 py-10 text-sm text-[#b9aa94] sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_1.45fr] md:items-start">
        <div>
          <Link
            href="/"
            className="font-display text-xl text-cream transition hover:text-champagne focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          >
            Vistaire
          </Link>
          <p className="mt-2 max-w-sm leading-6">
            Menu vivant premium pour restaurants.
          </p>
          <Link
            href="/owner"
            className="mt-4 inline-flex rounded-sm text-[10px] text-[#cdbd9f] transition hover:text-cream focus:outline-none focus-visible:text-cream focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-[#050403]"
          >
            Accès interne
          </Link>
        </div>

        <nav aria-label="Guides Vistaire" className="md:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne/75">
            Guides Vistaire
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 md:justify-end">
            {seoLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="leading-6 text-[#cdbfa9] transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </footer>
  );
}
