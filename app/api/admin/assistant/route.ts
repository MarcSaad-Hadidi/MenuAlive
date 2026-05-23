import { NextResponse, type NextRequest } from "next/server";
import {
  getAdminAssistantAnswer,
  validateAdminAssistantRequest
} from "@/lib/admin/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_000;

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Question trop longue." },
      { status: 413 }
    );
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Requête refusée." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Question invalide." },
      { status: 400 }
    );
  }

  const validation = validateAdminAssistantRequest(body);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 }
    );
  }

  const answer = await getAdminAssistantAnswer({
    restaurantId: validation.restaurantId,
    mode: validation.mode,
    question: validation.question,
    allowMistral: false,
    publicDemoOnly: true
  });

  return NextResponse.json({
    ok: true,
    answer: answer.answer,
    source: answer.source,
    dataSource: answer.dataSource
  });
}

export function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed." },
    { status: 405 }
  );
}
