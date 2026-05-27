import type { Metadata } from "next";
import { VistaireMenu3dArRestaurantPreview } from "@/components/vistaire-preview/VistaireMenu3dArRestaurantPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | Menu 3D AR restaurant",
  description: "Apercu isole de la page SEO preview Menu 3D AR restaurant.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/menu-3d-ar-restaurant"
  }
};

export default function VistaireMenu3dArRestaurantPreviewPage() {
  return <VistaireMenu3dArRestaurantPreview />;
}
