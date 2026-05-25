import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildPageServiceJsonLd,
  buildWebPageJsonLd
} from "@/lib/seo";
import type { SeoPageData } from "@/lib/seoPages";

export function buildSeoPillarJsonLd(page: SeoPageData) {
  return [
    buildWebPageJsonLd({
      path: page.path,
      name: page.metadataTitle,
      description: page.metadataDescription
    }),
    buildBreadcrumbJsonLd([
      { name: "Accueil", path: "/" },
      { name: page.h1, path: page.path }
    ]),
    buildPageServiceJsonLd({
      path: page.path,
      ...page.service
    }),
    buildFaqPageJsonLd(page.faq, page.path)
  ];
}
