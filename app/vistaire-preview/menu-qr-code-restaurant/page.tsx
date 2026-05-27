import type { Metadata } from "next";
import { VistaireMenuQrCodeRestaurantPreview } from "@/components/vistaire-preview/VistaireMenuQrCodeRestaurantPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | Menu QR code restaurant",
  description:
    "Aperçu preview de la page Menu QR code restaurant Vistaire avec parcours après scan et carte mobile premium.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/menu-qr-code-restaurant"
  }
};

export default function VistaireMenuQrCodeRestaurantPreviewPage() {
  return <VistaireMenuQrCodeRestaurantPreview />;
}
