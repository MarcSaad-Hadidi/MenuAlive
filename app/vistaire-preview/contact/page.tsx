import type { Metadata } from "next";
import { VistaireContactPreview } from "@/components/vistaire-preview/VistaireContactPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | Contact",
  description:
    "Apercu isole de la page Contact Vistaire, pensee pour les restaurants haut de gamme de la region de Montreal.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/contact"
  }
};

export default function VistaireContactPreviewPage() {
  return <VistaireContactPreview />;
}
