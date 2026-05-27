import type { Metadata } from "next";
import { VistaireAboutPreview } from "@/components/vistaire-preview/VistaireAboutPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | À propos",
  description:
    "Aperçu isolé de la page À propos Vistaire, pensée pour expliquer la vision premium de la carte digitale.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/a-propos"
  }
};

export default function VistaireAboutPreviewPage() {
  return <VistaireAboutPreview />;
}
