import type { Metadata } from "next";
import { VistaireRendezVousPreview } from "@/components/vistaire-preview/VistaireRendezVousPreview";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Prendre rendez-vous avec Vistaire",
  description:
    "Planifiez un rendez-vous avec Vistaire pour présenter votre restaurant avec une carte digitale premium.",
  alternates: {
    canonical: "/prendre-rendez-vous"
  },
  openGraph: {
    url: absoluteUrl("/prendre-rendez-vous"),
    title: "Prendre rendez-vous avec Vistaire",
    description:
      "Parlez-nous de votre restaurant, de votre carte et de l'expérience que vous souhaitez offrir.",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Prendre rendez-vous avec Vistaire",
    description:
      "Parlez-nous de votre restaurant, de votre carte et de l'expérience que vous souhaitez offrir."
  }
};

export default function PrendreRendezVousPage() {
  return <VistaireRendezVousPreview routeMode="production" />;
}
