import type { Metadata } from "next";
import { VistaireRendezVousPreview } from "@/components/vistaire-preview/VistaireRendezVousPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | Prendre rendez-vous",
  description:
    "Apercu isole du formulaire de rendez-vous Vistaire pour les restaurants haut de gamme de la region de Montreal.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/prendre-rendez-vous"
  }
};

export default function VistaireRendezVousPreviewPage() {
  return <VistaireRendezVousPreview />;
}
