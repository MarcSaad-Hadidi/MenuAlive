import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  INTERNAL_ROBOTS_DISALLOW,
  SITE_URL_FALLBACK,
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildRobotsRules,
  buildSitemapEntries,
  buildVistaireServiceJsonLd,
  buildWebsiteJsonLd,
  getSiteUrl,
  resolveSiteUrl
} from "../lib/seo.ts";

const siteEnv = {
  NEXT_PUBLIC_SITE_URL: "https://www.vistaire.ca/"
};

test("resolves canonical production URLs with a stable Vistaire fallback", () => {
  assert.equal(SITE_URL_FALLBACK, "https://www.vistaire.ca");
  assert.equal(resolveSiteUrl("vistaire.ca").origin, "https://vistaire.ca");
  assert.equal(getSiteUrl(siteEnv).origin, "https://www.vistaire.ca");
  assert.equal(
    absoluteUrl("/demo/dishes/homard-bisque", siteEnv),
    "https://www.vistaire.ca/demo/dishes/homard-bisque"
  );
});

test("builds a focused sitemap for public Vistaire surfaces", () => {
  const lastModified = new Date("2026-05-18T00:00:00.000Z");
  const entries = buildSitemapEntries(
    [{ slug: "homard-bisque" }, { slug: "ravioles-romarin" }],
    lastModified,
    siteEnv
  );
  const urls = entries.map((entry) => entry.url);

  assert.deepEqual(urls, [
    "https://www.vistaire.ca/",
    "https://www.vistaire.ca/a-propos",
    "https://www.vistaire.ca/contact",
    "https://www.vistaire.ca/prendre-rendez-vous",
    "https://www.vistaire.ca/menu-digital-restaurant",
    "https://www.vistaire.ca/menu-qr-code-restaurant",
    "https://www.vistaire.ca/menu-3d-ar-restaurant",
    "https://www.vistaire.ca/menu-pdf-vs-menu-digital",
    "https://www.vistaire.ca/demo",
  ]);
  for (const internalPath of ["/admin", "/owner", "/sign-in", "/todos", "/api/"]) {
    assert.equal(urls.some((url) => url.includes(internalPath)), false);
  }
  assert.equal(urls.some((url) => url.includes("/demo/dishes/")), false);
  assert.equal(entries.every((entry) => entry.lastModified === lastModified), true);
  assert.equal(entries.every((entry) => entry.priority > 0 && entry.priority <= 1), true);
});

test("keeps demo admin and dish detail pages out of search indexes", () => {
  const adminLayout = readFileSync(
    join(process.cwd(), "app", "admin", "layout.tsx"),
    "utf8"
  );
  const dishPage = readFileSync(
    join(process.cwd(), "app", "demo", "dishes", "[slug]", "page.tsx"),
    "utf8"
  );

  assert.match(adminLayout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*true/s);
  assert.match(dishPage, /robots:\s*\{\s*index:\s*false,\s*follow:\s*true/s);
});

test("declares the focused SEO page inventory without generic scale pages", async () => {
  assert.equal(existsSync(join(process.cwd(), "lib", "seoPages.ts")), true);

  const { SEO_PAGES, getSeoPage } = await import("../lib/seoPages.ts");
  const paths = SEO_PAGES.map((page) => page.path);

  assert.deepEqual(paths, [
    "/menu-digital-restaurant",
    "/menu-qr-code-restaurant",
    "/menu-3d-ar-restaurant",
    "/menu-pdf-vs-menu-digital"
  ]);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(paths.some((path) => path.includes("pos")), false);
  assert.equal(paths.some((path) => path.includes("commande")), false);

  for (const page of SEO_PAGES) {
    assert.equal(typeof page.metadataTitle, "string");
    assert.equal(page.metadataTitle.length > 20, true);
    assert.equal(page.metadataDescription.length > 80, true);
    assert.equal(page.metadataDescription.length < 170, true);
    assert.equal(typeof page.cardDescription, "string");
    assert.equal(page.cardDescription.length >= 40, true);
    assert.equal(page.cardDescription.length <= 160, true);
    assert.equal(page.cardDescription.endsWith("…"), false);
    assert.equal(typeof page.relatedDescription, "string");
    assert.equal(page.relatedDescription.length >= 30, true);
    assert.equal(page.relatedDescription.length <= 140, true);
    assert.equal(page.relatedDescription.endsWith("…"), false);
    assert.equal(typeof page.takeaway?.heading, "string");
    assert.equal(typeof page.takeaway?.text, "string");
    assert.equal(page.takeaway.text.length >= 80, true);
    assert.equal(page.sections.length >= 2, true);
    assert.equal(page.faq.length >= 5, true);
    assert.equal(getSeoPage(page.slug).path, page.path);
  }
});

test("allows useful crawlers while keeping internal surfaces out of robots crawl", () => {
  const rules = buildRobotsRules();
  const searchBotRule = rules.find((rule) => rule.userAgent === "OAI-SearchBot");
  const defaultRule = rules.find((rule) => rule.userAgent === "*");
  const expectedInternalDisallow = [
    "/api/",
    "/owner",
    "/owner/",
    "/sign-in",
    "/sign-in/",
    "/todos",
    "/todos/"
  ];

  assert.ok(searchBotRule);
  assert.ok(defaultRule);
  assert.deepEqual(searchBotRule.allow, "/");
  assert.deepEqual(defaultRule.allow, "/");
  assert.deepEqual(INTERNAL_ROBOTS_DISALLOW, expectedInternalDisallow);
  for (const internalPath of expectedInternalDisallow) {
    assert.equal(INTERNAL_ROBOTS_DISALLOW.includes(internalPath), true);
  }
  assert.deepEqual(searchBotRule.disallow, INTERNAL_ROBOTS_DISALLOW);
  assert.deepEqual(defaultRule.disallow, INTERNAL_ROBOTS_DISALLOW);
  assert.equal(INTERNAL_ROBOTS_DISALLOW.includes("/_next/"), false);
  assert.equal(INTERNAL_ROBOTS_DISALLOW.includes("/images/"), false);
  assert.equal(INTERNAL_ROBOTS_DISALLOW.includes("/models/"), false);
  assert.equal(INTERNAL_ROBOTS_DISALLOW.includes("/videos/"), false);
  assert.equal(INTERNAL_ROBOTS_DISALLOW.includes("/frames/"), false);
});

test("emits honest global JSON-LD without fictional restaurant markup", () => {
  const organization = buildOrganizationJsonLd(siteEnv);
  const website = buildWebsiteJsonLd(siteEnv);
  const service = buildVistaireServiceJsonLd(siteEnv);
  const breadcrumb = buildBreadcrumbJsonLd(
    [
      { name: "Accueil", path: "/" },
      { name: "Menu client exemple", path: "/demo" }
    ],
    siteEnv
  );

  assert.equal(organization["@type"], "Organization");
  assert.equal(website["@type"], "WebSite");
  assert.equal(service["@type"], "Service");
  assert.equal(breadcrumb["@type"], "BreadcrumbList");
  assert.equal(service.provider["@id"], organization["@id"]);
  assert.equal(service.url, "https://www.vistaire.ca/");
  assert.equal("areaServed" in service, false);
  assert.equal(service.mainEntityOfPage["@id"], "https://www.vistaire.ca/#webpage");
  assert.equal(service.hasOfferCatalog["@type"], "OfferCatalog");
  assert.deepEqual(
    breadcrumb.itemListElement.map((item) => item.item),
    ["https://www.vistaire.ca/", "https://www.vistaire.ca/demo"]
  );

  const serialized = JSON.stringify([
    organization,
    website,
    service,
    breadcrumb
  ]);
  assert.equal(serialized.includes('"@type":"Restaurant"'), false);
  assert.equal(serialized.includes('"@type":"LocalBusiness"'), false);
  assert.equal(serialized.includes('"@type":"MenuItem"'), false);
  assert.equal(serialized.includes("AggregateRating"), false);
  assert.equal(serialized.includes("Review"), false);
  assert.equal(serialized.includes("FAQPage"), false);
});

test("guide cards use hand-written descriptions without truncation", () => {
  const guidesSection = readFileSync(
    join(process.cwd(), "components", "landing", "GuidesVistaireSection.tsx"),
    "utf8"
  );
  const internalLinks = readFileSync(
    join(process.cwd(), "components", "seo", "InternalSeoLinks.tsx"),
    "utf8"
  );

  assert.equal(guidesSection.includes(".slice("), false);
  assert.equal(internalLinks.includes(".slice("), false);
  assert.match(guidesSection, /page\.cardDescription/);
  assert.match(internalLinks, /page\.relatedDescription/);
});

test("FAQPage JSON-LD mirrors visible FAQ inventory", async () => {
  const { SEO_PAGES } = await import("../lib/seoPages.ts");
  const { buildFaqPageJsonLd } = await import("../lib/seo.ts");

  for (const page of SEO_PAGES) {
    const faqJsonLd = buildFaqPageJsonLd(page.faq, page.path, siteEnv);
    assert.equal(faqJsonLd.mainEntity.length, page.faq.length);
    assert.equal(faqJsonLd.mainEntity.length >= 5, true);
    assert.deepEqual(
      faqJsonLd.mainEntity.map((item) => item.name),
      page.faq.map((item) => item.question)
    );
  }
});

test("builds WebPage and per-page Service JSON-LD with absolute URLs", async () => {
  const seo = await import("../lib/seo.ts");

  assert.equal(typeof seo.buildWebPageJsonLd, "function");
  assert.equal(typeof seo.buildPageServiceJsonLd, "function");
  assert.equal(typeof seo.buildFaqPageJsonLd, "function");

  const webPage = seo.buildWebPageJsonLd(
    {
      path: "/menu-digital-restaurant",
      name: "Menu digital restaurant premium | Vistaire",
      description:
        "Vistaire transforme le menu digital restaurant en experience premium.",
      dateModified: new Date("2026-05-19T00:00:00.000Z")
    },
    siteEnv
  );
  const servicePage = seo.buildPageServiceJsonLd(
    {
      path: "/menu-3d-ar-restaurant",
      name: "Menu 3D/AR Vistaire",
      serviceType: "Presentation 3D/AR selective pour menus de restaurants",
      description:
        "Vues 3D/AR quand les assets et appareils le permettent, avec fallback premium."
    },
    siteEnv
  );

  assert.equal(webPage["@type"], "WebPage");
  assert.equal(webPage.url, "https://www.vistaire.ca/menu-digital-restaurant");
  assert.equal(webPage.isPartOf["@id"], "https://www.vistaire.ca/#website");
  assert.equal(webPage.publisher["@id"], "https://www.vistaire.ca/#organization");
  assert.equal(webPage.inLanguage, "fr-CA");
  assert.equal(webPage.dateModified, "2026-05-19T00:00:00.000Z");
  assert.equal(servicePage["@type"], "Service");
  assert.equal(servicePage.url, "https://www.vistaire.ca/menu-3d-ar-restaurant");
  assert.equal(servicePage.provider["@id"], "https://www.vistaire.ca/#organization");
  assert.equal("areaServed" in servicePage, false);

  const faqPage = buildFaqPageJsonLd(
    [
      {
        question: "Un PDF est-il un menu digital ?",
        answer: "Non. Un PDF reste un fichier statique difficile à lire sur mobile."
      }
    ],
    "/menu-pdf-vs-menu-digital",
    siteEnv
  );
  assert.equal(faqPage["@type"], "FAQPage");
  assert.equal(faqPage.mainEntity.length, 1);
  assert.equal(faqPage.mainEntity[0].name, "Un PDF est-il un menu digital ?");
});
