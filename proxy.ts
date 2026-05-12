import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { updateSession } from "@/utils/supabase/middleware";

const isProtectedRoute = createRouteMatcher([
  "/owner(.*)",
  "/api/analytics/summary(.*)",
  "/api/restaurants(.*)",
  "/api/owner(.*)",
  "/todos(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  return updateSession(request);
}, { signInUrl: "/sign-in" });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|glb|usdz)).*)",
    "/(api|trpc)(.*)",
  ],
};
