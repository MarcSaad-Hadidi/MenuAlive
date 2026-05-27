import type { Metadata } from "next";
import { VistairePdfVsMenuDigitalPreview } from "@/components/vistaire-preview/VistairePdfVsMenuDigitalPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | PDF vs menu digital",
  description:
    "Aperçu preview de la page SEO PDF vs menu digital Vistaire, pensée pour comparer un menu PDF et une carte digitale premium.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/pdf-vs-menu-digital"
  }
};

export default function VistairePdfVsMenuDigitalPreviewPage() {
  return <VistairePdfVsMenuDigitalPreview />;
}
