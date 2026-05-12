import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Aperçu restaurateur | Vistaire",
  description:
    "Aperçu restaurateur de présentation pour lire les comportements clients autour du menu Vistaire de Maison Élyse."
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
