import type { Metadata } from "next";
import { VistaireMenuDigitalRestaurantPreview } from "@/components/vistaire-preview/VistaireMenuDigitalRestaurantPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | Menu digital restaurant",
  description:
    "Aperçu preview de la page Menu digital restaurant Vistaire avec comparaison PDF vers carte digitale premium.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/menu-digital-restaurant"
  }
};

export default function VistaireMenuDigitalRestaurantPreviewPage() {
  return <VistaireMenuDigitalRestaurantPreview />;
}
