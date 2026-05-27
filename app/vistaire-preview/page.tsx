import type { Metadata } from "next";
import { VistairePreviewLanding } from "@/components/vistaire-preview/VistairePreviewLanding";

export const metadata: Metadata = {
  title: "Vistaire preview | Nouvelle landing",
  description: "Apercu isole de la nouvelle landing Vistaire.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview"
  }
};

export default function VistairePreviewPage() {
  return <VistairePreviewLanding />;
}
