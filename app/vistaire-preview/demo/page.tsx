import type { Metadata } from "next";
import { VistaireMenuPreview } from "@/components/vistaire-preview/VistaireMenuPreview";

export const metadata: Metadata = {
  title: "Vistaire preview | Carte digitale Maison Élyse",
  description:
    "Démo interactive Vistaire avec Maison Élyse, restaurant fictif utilisé pour présenter une carte client premium.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  alternates: {
    canonical: "/vistaire-preview/demo"
  }
};

export default function VistaireMenuPreviewPage() {
  return <VistaireMenuPreview />;
}
