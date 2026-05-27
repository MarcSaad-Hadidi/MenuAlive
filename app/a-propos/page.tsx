import type { Metadata } from "next";
import { VistaireAboutPreview } from "@/components/vistaire-preview/VistaireAboutPreview";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "À propos de Vistaire",
  description:
    "Vistaire transforme le QR code d'un restaurant en carte digitale premium, mobile-first, visuelle et pensée pour les restaurants haut de gamme.",
  alternates: {
    canonical: "/a-propos"
  },
  openGraph: {
    url: absoluteUrl("/a-propos"),
    title: "À propos de Vistaire",
    description:
      "Une carte digitale premium qui prolonge l'expérience du restaurant sans remplacer le service.",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "À propos de Vistaire",
    description:
      "Une carte digitale premium qui prolonge l'expérience du restaurant sans remplacer le service."
  }
};

export default function AProposPage() {
  return <VistaireAboutPreview routeMode="production" />;
}
