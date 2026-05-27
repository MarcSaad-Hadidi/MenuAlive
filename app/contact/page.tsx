import type { Metadata } from "next";
import { VistaireContactPreview } from "@/components/vistaire-preview/VistaireContactPreview";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact Vistaire",
  description:
    "Contactez Vistaire pour créer une carte digitale premium pour restaurant haut de gamme.",
  alternates: {
    canonical: "/contact"
  },
  openGraph: {
    url: absoluteUrl("/contact"),
    title: "Contact Vistaire",
    description:
      "Parlez à Vistaire de votre carte, de vos fiches plats et de votre expérience mobile.",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Contact Vistaire",
    description:
      "Parlez à Vistaire de votre carte, de vos fiches plats et de votre expérience mobile."
  }
};

export default function ContactPage() {
  return <VistaireContactPreview routeMode="production" />;
}
