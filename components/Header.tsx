import { PrimaryButton } from "@/components/PrimaryButton";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-full border border-white/10 bg-[#070504]/62 px-4 shadow-[0_16px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:h-16 sm:px-5"
      >
        <a
          href="#experience"
          className="font-display text-xl leading-none text-cream outline-none focus-visible:ring-2 focus-visible:ring-champagne sm:text-2xl"
          aria-label="MenuAlive accueil"
        >
          MenuAlive
        </a>

        <div className="hidden items-center gap-8 text-sm text-[#dbcdb8] md:flex">
          <a
            className="transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            href="#experience"
          >
            Expérience
          </a>
          <a
            className="transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            href="#benefices"
          >
            Bénéfices
          </a>
        </div>

        <PrimaryButton href="#demo" size="small" aria-label="Demander une démo">
          Demander une démo
        </PrimaryButton>
      </nav>
    </header>
  );
}
