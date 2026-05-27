export const dynamic = "force-static";

const VISTAIRE_VIDEO_SRC = "/videos/Vistaire2.mp4";

export function GET(request: Request) {
  return Response.redirect(new URL(VISTAIRE_VIDEO_SRC, request.url), 307);
}
