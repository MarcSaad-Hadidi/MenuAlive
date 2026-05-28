import { buildRobotsTxt } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildRobotsTxt(), {
    headers: {
      "Cache-Control": "public, max-age=14400, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
