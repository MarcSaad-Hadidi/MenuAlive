import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Aperçu restaurateur de démonstration",
  description:
    "Aperçu restaurateur de démonstration Vistaire pour lire les signaux anonymes autour d'une carte convive fictive.",
  alternates: {
    canonical: "/admin"
  },
  robots: {
    index: false,
    follow: true,
    noarchive: true
  },
  openGraph: {
    url: absoluteUrl("/admin"),
    title: "Aperçu restaurateur de démonstration | Vistaire",
    description:
      "Découvrez comment Vistaire présente les signaux anonymes autour d'une carte convive fictive.",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Aperçu restaurateur de démonstration | Vistaire",
    description:
      "Découvrez comment Vistaire présente les signaux anonymes autour d'une carte convive fictive."
  }
};

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
    </>
  );
}
