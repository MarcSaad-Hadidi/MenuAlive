import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import {
  getVistaireOwnerAuthorization,
  type VistaireOwnerAuthorization
} from "@/lib/auth/owner";
import {
  owner3dAccessDeniedMessage,
  ownerCanAccess3dRestaurant
} from "@/lib/auth/owner3dAccess";

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

export function requireSameOriginOwnerMutation(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { ok: false, error: "Owner mutation must come from the Vistaire owner app." },
      { status: 403 }
    );
  }

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return NextResponse.json(
      { ok: false, error: "Owner mutation must be same-origin." },
      { status: 403 }
    );
  }

  return null;
}

export function requireOwner3dRestaurantAccess(
  owner: Extract<VistaireOwnerAuthorization, { ok: true }>,
  restaurantSlug: string
): NextResponse | null {
  if (ownerCanAccess3dRestaurant(owner, restaurantSlug)) return null;

  return NextResponse.json(
    { ok: false, error: owner3dAccessDeniedMessage() },
    { status: 403 }
  );
}
