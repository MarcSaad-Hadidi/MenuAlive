import { expect, test } from "@playwright/test";

const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/menu-digital-restaurant",
  "/menu-qr-code-restaurant",
  "/menu-3d-ar-restaurant",
  "/menu-pdf-vs-menu-digital",
  "/demo"
];

const INTERNAL_ROBOTS_PATHS = [
  "/api/",
  "/owner",
  "/owner/",
  "/sign-in",
  "/sign-in/",
  "/todos",
  "/todos/"
];

const ASSET_PATHS = ["/_next/", "/images/", "/models/", "/videos/", "/frames/"];

const PUBLIC_HEAD_PAGES = [
  {
    path: "/",
    title: /Menu digital QR premium/i,
    heading: /QR code|carte/i,
    canonicalPath: "/",
    robotsShouldNotContain: /noindex/i
  },
  {
    path: "/demo",
    title: /Maison .lyse|Vistaire/i,
    heading: /Maison .lyse/i,
    canonicalPath: "/demo",
    robotsShouldNotContain: /noindex/i
  },
  {
    path: "/menu-digital-restaurant",
    title: /Menu digital restaurant premium/i,
    heading: /Menu digital restaurant premium/i,
    canonicalPath: "/menu-digital-restaurant",
    robotsShouldNotContain: /noindex/i
  }
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSitemapPaths(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    const url = new URL(match[1]);
    return url.pathname;
  });
}

test.describe("Vistaire SEO smoke", () => {
  test("robots.txt exposes sitemap and preserves public asset crawling", async ({
    request
  }) => {
    const response = await request.get("/robots.txt");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toContain("text/plain");

    const body = await response.text();
    expect(body).toMatch(/^User-agent:\s*\*/im);
    expect(body).toMatch(/^Allow:\s*\/\s*$/im);

    for (const path of INTERNAL_ROBOTS_PATHS) {
      expect(body).toMatch(
        new RegExp(`^Disallow:\\s*${escapeRegExp(path)}\\s*$`, "im")
      );
    }

    for (const path of ASSET_PATHS) {
      expect(body).not.toMatch(
        new RegExp(`^Disallow:\\s*${escapeRegExp(path)}\\s*$`, "im")
      );
    }

    const sitemap = body.match(/^Sitemap:\s*(\S+)/im)?.[1];
    expect(sitemap).toBeTruthy();
    expect(new URL(sitemap!).pathname).toBe("/sitemap.xml");
  });

  test("sitemap.xml contains indexable public pages only", async ({
    request
  }) => {
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toMatch(/xml/i);

    const paths = extractSitemapPaths(await response.text());
    expect(paths).toEqual(expect.arrayContaining(PUBLIC_SITEMAP_PATHS));
    expect(new Set(paths).size).toBe(paths.length);

    for (const privatePath of ["/admin", "/owner", "/sign-in", "/todos", "/api/"]) {
      expect(
        paths.some(
          (path) => path === privatePath || path.startsWith(`${privatePath}/`)
        )
      ).toBe(false);
    }
    expect(paths.some((path) => path.startsWith("/demo/dishes/"))).toBe(false);
  });

  for (const route of PUBLIC_HEAD_PAGES) {
    test(`${route.path} serves useful public head metadata`, async ({ page }) => {
      const response = await page.goto(route.path, {
        waitUntil: "domcontentloaded"
      });

      expect(response?.status()).toBeLessThan(400);
      await expect(page).toHaveTitle(route.title);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }).first()
      ).toBeVisible();

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", /Vistaire|menu/i);

      const canonicalHref = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(canonicalHref).toBeTruthy();
      expect(new URL(canonicalHref!, page.url()).pathname).toBe(
        route.canonicalPath
      );

      const robots = await page
        .locator('meta[name="robots"]')
        .getAttribute("content");
      expect(robots ?? "").not.toMatch(route.robotsShouldNotContain);
    });
  }

  test("noindex routes advertise noindex in served metadata", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noarchive/i
    );

    await page.goto("/demo/dishes/homard-bisque", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );
    const dishCanonicalHref = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(new URL(dishCanonicalHref!, page.url()).pathname).toBe(
      "/demo/dishes/homard-bisque"
    );
  });
});
