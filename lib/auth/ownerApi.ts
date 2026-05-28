import "server-only";

import { NextResponse } from "next/server";
import {
  getVistaireOwnerAuthorization,
  type VistaireOwnerAuthorization
} from "@/lib/auth/owner";

type OwnerApiAuthorization =
  | Extract<VistaireOwnerAuthorization, { ok: true }>
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireVistaireOwnerApi(): Promise<OwnerApiAuthorization> {
  const authorization = await getVistaireOwnerAuthorization();

  if (!authorization.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: authorization.error
        },
        { status: authorization.status }
      )
    };
  }

  return authorization;
}
