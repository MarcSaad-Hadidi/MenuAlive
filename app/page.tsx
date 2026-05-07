import { DemoRequestSection } from "@/components/DemoRequestSection";
import { Header } from "@/components/Header";
import { CanvasScrollVideo } from "@/components/CanvasScrollVideo";

const benefits = [
  {
    title: "Plus visuel",
    body: "Des photos et fiches plats qui aident les clients à choisir avec confiance."
  },
  {
    title: "Plus premium",
    body: "Une présentation qui valorise vos plats signatures et votre image de marque."
  },
  {
    title: "Plus immersif",
    body: "La 3D / AR crée un moment mémorable, sans téléchargement d’application."
  }
];

function BenefitsSection() {
  return (
    <section
      id="benefices"
      className="bg-[#070504] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-4xl font-display text-[clamp(2.35rem,6vw,5.5rem)] font-normal leading-[1.02] text-cream">
          Une expérience plus claire pour vos clients. Plus forte pour votre restaurant.
        </h2>

        <div className="mt-12 grid gap-8 border-t border-white/12 pt-9 md:grid-cols-3 lg:mt-16 lg:pt-11">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="max-w-sm md:pr-8">
              <h3 className="text-xl font-semibold text-champagne">
                {benefit.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-[#d1c2aa]">
                {benefit.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050403] px-5 py-10 text-sm text-[#b9aa94] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-xl text-cream">MenuAlive / MenuVivant</p>
        <p>Menu digital premium pour restaurants.</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <CanvasScrollVideo />
        <BenefitsSection />
        <DemoRequestSection />
      </main>
      <Footer />
    </>
  );
}
