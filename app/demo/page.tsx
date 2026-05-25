import { JsonLd } from "@/components/JsonLd";
import { SecondaryButtonLink } from "@/components/SecondaryButtonLink";
import { DemoMenuClient } from "@/components/menu/DemoMenuClient";
import { MenuHero } from "@/components/menu/MenuHero";
import {
  getAllDishes,
  getCategories,
  getRestaurant
} from "@/lib/demoMenuData";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

function PresentationPathway() {
  return (
    <section
      className="glass-panel my-5 rounded-lg px-4 py-4 sm:my-6 sm:px-5"
      aria-labelledby="presentation-pathway-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p
            id="presentation-pathway-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne/80"
          >
            Parcours de présentation
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b9aa94]">
            Maison Élyse est un restaurant exemple de présentation : il montre
            le menu client Vistaire et l’aperçu restaurateur associé.
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row sm:shrink-0">
          <SecondaryButtonLink
            href="/demo"
            aria-current="page"
            size="small"
            variant="secondary"
            className="text-champagne"
          >
            Menu client
          </SecondaryButtonLink>
          <SecondaryButtonLink href="/admin" size="small" variant="ghost">
            Aperçu restaurateur
          </SecondaryButtonLink>
        </div>
      </div>
    </section>
  );
}

export default function DemoPage() {
  const restaurant = getRestaurant();
  const categories = getCategories();
  const dishes = getAllDishes();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Menu client exemple", path: "/demo" }
        ])}
      />
      <MenuHero restaurant={restaurant} />
      <PresentationPathway />
      <DemoMenuClient
        categories={categories}
        dishes={dishes}
        currency={restaurant.currency}
      />
    </>
  );
}
