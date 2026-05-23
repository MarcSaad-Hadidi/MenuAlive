import type { Metadata } from "next";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { DemoExperienceShell } from "@/components/menu/DemoExperienceShell";
import { DemoSimulationProvider } from "@/components/menu/DemoSimulationContext";
import { Header } from "@/components/Header";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Démo Vistaire — Maison Élyse, restaurant fictif",
  description:
    "Maison Élyse est un restaurant fictif de démonstration Vistaire : carte côté convive, fiches plats, allergènes, accords et vues immersives.",
  alternates: {
    canonical: "/demo"
  },
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    url: absoluteUrl("/demo"),
    title: "Démo Vistaire — Maison Élyse, restaurant fictif",
    description:
      "Restaurant fictif de démonstration Vistaire avec carte côté convive, fiches plats et vues immersives.",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Démo Vistaire — Maison Élyse, restaurant fictif",
    description:
      "Restaurant fictif de démonstration Vistaire avec carte côté convive, fiches plats et vues immersives."
  }
};

export default function DemoLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#080706] pt-[4.5rem] sm:pt-20">
        <SmoothScrollProvider>
          <DemoSimulationProvider>
            <DemoExperienceShell>{children}</DemoExperienceShell>
          </DemoSimulationProvider>
        </SmoothScrollProvider>
      </main>
    </>
  );
}
