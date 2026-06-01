"use client";

import { ClerkProvider } from "@clerk/nextjs";
import styles from "@/components/owner/OwnerCockpit.module.css";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { OwnerUserButton } from "@/components/owner/OwnerUserButton";
import {
  vistaireClerkAppearance,
  vistaireClerkLocalization
} from "@/lib/clerkAppearance";

export function OwnerClerkBoundary({ children }: { children: React.ReactNode }) {
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
        <OwnerShell accountControl={<OwnerUserButton />}>{children}</OwnerShell>
      </div>
    </ClerkProvider>
  );
}
