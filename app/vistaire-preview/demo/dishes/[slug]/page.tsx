import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VistaireDishDetailPreview } from "@/components/vistaire-preview/VistaireDishDetailPreview";
import {
  getAllDishes,
  getCategoryBySlug,
  getDishBySlug,
  getRestaurant
} from "@/lib/demoMenuData";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams(): { slug: string }[] {
  return getAllDishes().map((dish) => ({ slug: dish.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dish = getDishBySlug(slug);

  if (!dish) {
    return {
      title: "Plat introuvable | Vistaire preview",
      robots: {
        index: false,
        follow: false,
        nocache: true
      }
    };
  }

  const restaurant = getRestaurant();

  return {
    title: `${dish.name} | ${restaurant.name} | Vistaire preview`,
    description: `${dish.shortDescription} Fiche plat premium de demonstration Vistaire pour ${restaurant.name}.`,
    robots: {
      index: false,
      follow: false,
      nocache: true
    },
    alternates: {
      canonical: `/vistaire-preview/demo/dishes/${dish.slug}`
    }
  };
}

export default async function VistairePreviewDishPage({ params }: PageProps) {
  const { slug } = await params;
  const dish = getDishBySlug(slug);

  if (!dish) {
    notFound();
  }

  const restaurant = getRestaurant();
  const categoryName =
    getCategoryBySlug(dish.categorySlug)?.name ?? "Création Maison Élyse";

  return (
    <VistaireDishDetailPreview
      categoryName={categoryName}
      dish={dish}
      restaurant={restaurant}
    />
  );
}
