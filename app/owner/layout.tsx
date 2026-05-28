import type { Metadata } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/owner/OwnerCockpit.module.css";
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
      <div className={styles.ownerTheme}>
        <div className={styles.topbarWrap}>
          <header className={styles.topbar}>
            <Link className={styles.brand} href="/owner" prefetch={false}>
              <span className={styles.brandName}>Vistaire</span>
              <span className={styles.brandMeta}>Cockpit owner</span>
            </Link>
            <nav className={styles.topLinks} aria-label="Navigation owner">
              <Link href="/owner" prefetch={false}>
                Cockpit
              </Link>
              <Link href="/apercu-restaurateur" prefetch={false}>
                Aperçu public
              </Link>
              <Link href="/admin" prefetch={false}>
                Dashboard exemple
              </Link>
            </nav>
            <div className={styles.userSlot}>
              <UserButton />
            </div>
          </header>
        </div>
        {children}
      </div>
    </ClerkProvider>
  );
}
