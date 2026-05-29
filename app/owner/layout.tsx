import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { OwnerShell } from "@/components/owner/OwnerShell";
import {
  vistaireClerkAppearance,
  vistaireClerkLocalization
} from "@/lib/clerkAppearance";
import { getVistaireOwnerAuthorization } from "@/lib/auth/owner";

export const metadata: Metadata = {
  title: "Vistaire Owner",
  description:
    "Owner Command Center Vistaire : restaurants, menus, QR sécurisés, médias, 3D/AR, readiness et copilot.",
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
      <div className={styles.ownerTheme}>
        <OwnerShell>{children}</OwnerShell>
      </div>
    </ClerkProvider>
  );
}
