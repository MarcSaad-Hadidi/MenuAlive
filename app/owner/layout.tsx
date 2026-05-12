import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Pilotage Vistaire | Owner",
  description:
    "Dashboard propriétaire Vistaire pour suivre les restaurants, les menus et les recommandations automatiques."
};

export default function OwnerLayout({
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
