import { absoluteUrl } from "@/lib/seo";
import { buildRestaurantMenuPath } from "@/lib/owner/menuUrlCore";

export {
  buildRestaurantDashboardPath,
  buildRestaurantMenuPath,
  slugifyRestaurantSlug
} from "@/lib/owner/menuUrlCore";

type SiteUrlEnv = {
  [key: string]: string | undefined;
};

export function buildRestaurantMenuUrl(
  slugOrName: string,
  env?: SiteUrlEnv
): string {
  return absoluteUrl(buildRestaurantMenuPath(slugOrName), env);
}
