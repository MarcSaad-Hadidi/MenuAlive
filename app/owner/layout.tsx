import type { Metadata } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import {
  vistaireClerkAppearance,
  vistaireClerkLocalization
} from "@/lib/clerkAppearance";
import { getVistaireOwnerAuthorization } from "@/lib/auth/owner";

export const metadata: Metadata = {
  title: "Pilotage Vistaire",
  description:
    "Espace interne Vistaire pour suivre les restaurants, les menus et les recommandations automatiques.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true
  }
};

export default async function OwnerLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  await auth.protect();
  const ownerAuthorization = await getVistaireOwnerAuthorization();
  if (!ownerAuthorization.ok) {
    notFound();
  }

  return (
    <ClerkProvider
      appearance={vistaireClerkAppearance}
      localization={vistaireClerkLocalization}
      telemetry={false}
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      afterSignOutUrl="/"
    >
      <Header userSlot={<UserButton />} />
      <main className="min-h-screen">{children}</main>
    </ClerkProvider>
  );
}
