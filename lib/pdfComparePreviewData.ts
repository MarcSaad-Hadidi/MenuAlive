import type { Allergen, Category, Dish } from "@/lib/demoMenuData";
import {
  getCategories,
  getDishBySlug,
  getDishCardImageObjectPosition,
  getDishesByCategorySlug,
  getRestaurant
} from "@/lib/demoMenuData";
import { formatPrice } from "@/lib/formatPrice";
import { dishHasImmersiveAsset } from "@/lib/menuQuery";

export type PdfMenuRow = {
  name: string;
  price: string;
};

export type PdfMenuSection = {
  title: string;
  rows: PdfMenuRow[];
};

export type CompareCategoryTab = Pick<Category, "id" | "slug" | "name"> & {
  slug: string;
};

export type CompareDishPreview = {
  slug: string;
  name: string;
  price: string;
  shortDescription: string;
  image: string | null;
  imageAlt: string;
  imageObjectPosition: string;
  allergens: Allergen[];
  isSignature: boolean;
  isRecommended: boolean;
  has3d: boolean;
  isAvailable: boolean;
};

export type PdfComparePreviewData = {
  restaurant: {
    name: string;
    tagline: string;
    location: string;
    logoMonogram: string;
    currency: string;
  };
  pdfSections: PdfMenuSection[];
  categoryTabs: CompareCategoryTab[];
  activeCategorySlug: string;
  vistaireDishes: CompareDishPreview[];
};

const PDF_SECTION_SLUGS = [
  "entrees",
  "plats-signatures",
  "desserts",
  "cocktails"
] as const;
const VISTAIRE_PREVIEW_CATEGORY = "desserts";
const VISTAIRE_PREVIEW_DISH_SLUGS = ["tarte-citron-basilic", "souffle-chocolat"] as const;

export type PdfComparePreviewOptions = {
  activeCategorySlug?: string;
  vistaireDishSlugs?: readonly string[];
};

function formatPdfMenuPrice(amount: number): string {
  return `${amount} $`;
}

function toPdfRow(dish: Dish): PdfMenuRow {
  return {
    name: dish.name,
    price: formatPdfMenuPrice(dish.price)
  };
}

function toCompareDishPreview(dish: Dish, currency: string): CompareDishPreview {
  return {
    slug: dish.slug,
    name: dish.name,
    price: formatPrice(dish.price, currency),
    shortDescription: dish.shortDescription,
    image: dish.image,
    imageAlt: `Photo du plat : ${dish.name}`,
    imageObjectPosition: getDishCardImageObjectPosition(dish),
    allergens: dish.allergens,
    isSignature: dish.isSignature,
    isRecommended: dish.isRecommended,
    has3d: dishHasImmersiveAsset(dish),
    isAvailable: dish.isAvailable
  };
}

/** Source de vérité partagée avec `/demo` pour le slider PDF vs Vistaire. */
export function buildPdfComparePreviewData(
  options: PdfComparePreviewOptions = {}
): PdfComparePreviewData {
  const activeCategorySlug = options.activeCategorySlug ?? VISTAIRE_PREVIEW_CATEGORY;
  const vistaireDishSlugs = options.vistaireDishSlugs ?? VISTAIRE_PREVIEW_DISH_SLUGS;
  const restaurant = getRestaurant();
  const categories = getCategories();

  const pdfSections: PdfMenuSection[] = PDF_SECTION_SLUGS.map((slug) => {
    const category = categories.find((entry) => entry.slug === slug);
    const rows = getDishesByCategorySlug(slug).map(toPdfRow);
    return {
      title: category?.name ?? slug,
      rows
    };
  });

  const categoryTabs: CompareCategoryTab[] = [
    { id: "tab-tous", slug: "tous", name: "Tous" },
    ...categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name
    }))
  ];

  const vistaireDishes = vistaireDishSlugs.map((slug) => {
    const dish = getDishBySlug(slug);
    if (!dish) {
      throw new Error(`Missing demo dish for PDF compare preview: ${slug}`);
    }
    return toCompareDishPreview(dish, restaurant.currency);
  });

  return {
    restaurant: {
      name: restaurant.name,
      tagline: restaurant.tagline,
      location: restaurant.location,
      logoMonogram: restaurant.logoMonogram,
      currency: restaurant.currency
    },
    pdfSections,
    categoryTabs,
    activeCategorySlug,
    vistaireDishes
  };
}
