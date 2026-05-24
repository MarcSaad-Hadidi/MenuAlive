import type { Metadata } from "next";
import { PremiumSeoPage } from "@/components/seo/PremiumSeoPage";
import { absoluteUrl } from "@/lib/seo";
import { getSeoPage } from "@/lib/seoPages";

const page = getSeoPage("menu-digital-restaurant");

export const metadata: Metadata = {
  title: {
    absolute: page.metadataTitle
  },
  description: page.metadataDescription,
  alternates: {
    canonical: page.path
  },
  openGraph: {
    url: absoluteUrl(page.path),
    title: page.metadataTitle,
    description: page.metadataDescription,
    type: "website",
    images: [
      {
        url: absoluteUrl(page.visualImage.src),
        alt: page.visualImage.alt
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: page.metadataTitle,
    description: page.metadataDescription,
    images: [absoluteUrl(page.visualImage.src)]
  }
};

export default function MenuDigitalRestaurantPage() {
  return <PremiumSeoPage page={page} />;
}
