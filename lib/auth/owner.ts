import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { isOwnerIdentityAllowed } from "@/lib/auth/ownerPolicy";

export type VistaireOwnerAuthorization =
  | {
      ok: true;
      userId: string;
      emailAddresses: string[];
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    };

export async function getVistaireOwnerAuthorization(): Promise<VistaireOwnerAuthorization> {
  const authState = await auth();
  if (!authState.userId) {
    return {
      ok: false,
      status: 401,
      error: "Authentification requise."
    };
  }

  const user = await currentUser();
  const emailAddresses =
    user?.emailAddresses
      .map((email) => email.emailAddress)
      .filter((email): email is string => Boolean(email)) ?? [];
  const userId = user?.id ?? authState.userId;

  if (!isOwnerIdentityAllowed({ userId, emailAddresses }, process.env)) {
    return {
      ok: false,
      status: 403,
      error: "Acces owner Vistaire requis."
    };
  }

  return {
    ok: true,
    userId,
    emailAddresses
  };
}
