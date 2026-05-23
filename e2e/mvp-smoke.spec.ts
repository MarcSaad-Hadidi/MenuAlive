import { expect, type Page, test } from "@playwright/test";

const DEMO_RESTAURANT_ID = "11111111-1111-1111-1111-111111111111";
const MODEL_ASSET_PATTERN = /\/models\/.*\.(?:glb|usdz)(?:[?#]|$)/i;
const SIGNED_OUT_AUTH_TARGET_PATTERN = /\/sign-in|\/v1\/client\/handshake/;

function watchCriticalBrowserErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    ) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

async function stubAnalytics(page: Page) {
  await page.route("**/api/analytics/events", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });
}

async function expectHealthyResponse(
  response: Awaited<ReturnType<Page["goto"]>>
) {
  expect(response, "route should return a response").not.toBeNull();
  expect(response?.status()).toBeLessThan(400);
}

test.describe("Vistaire MVP smoke", () => {
  test("landing loads with core CTAs and no critical console errors", async ({
    page
  }) => {
    const criticalErrors = watchCriticalBrowserErrors(page);
    await stubAnalytics(page);

    await expectHealthyResponse(
      await page.goto("/", { waitUntil: "domcontentloaded" })
    );

    await expect(
      page.getByRole("navigation", { name: /Navigation principale/i })
    ).toBeVisible();
    await expect(page.locator("#experience")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText("Vistaire").first()).toBeVisible();

    const heroCopy = page.locator("#experience .chapter-copy").first();
    await expect(
      heroCopy.getByRole("link", { name: /Voir la carte/i }).first()
    ).toHaveAttribute("href", "/demo");
    await expect(
      heroCopy.getByRole("link", { name: /aper.u restaurateur d.mo/i }).first()
    ).toHaveAttribute("href", "/admin");

    const demoSection = page.locator("#demo");
    await expect(demoSection).toBeVisible();
    await expect(
      demoSection.getByRole("link", { name: /Voir la carte/i })
    ).toHaveAttribute("href", "/demo");
    await expect(
      demoSection.getByRole("link", { name: /aper.u restaurateur d.mo/i })
    ).toHaveAttribute("href", "/admin");
    await expect(page.locator("#benefices")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    expect(criticalErrors).toEqual([]);
  });

  test("demo menu search, filters, and dish link stay usable", async ({
    page
  }) => {
    await stubAnalytics(page);

    await expectHealthyResponse(
      await page.goto("/demo", { waitUntil: "domcontentloaded" })
    );

    await expect(page.locator("[data-demo-root]").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Maison .lyse/i })
    ).toBeVisible();

    const menu = page.locator('section[aria-label="Carte du restaurant"]');
    await expect(menu).toBeVisible();
    await expect(
      page.getByRole("tablist", { name: /Cat.gories du menu/i })
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tous" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    const search = page.getByLabel(/Rechercher un plat ou un ingr.dient/i);
    await expect(search).toBeVisible();
    await search.fill("homard");

    const homardLink = page.getByRole("link", {
      name: /Voir le plat.*Homard bleu/i
    });
    await expect(homardLink).toBeVisible();
    await expect(page.getByText(/Homard bleu/i).first()).toBeVisible();

    await search.fill("");
    const view3dFilter = page.getByRole("button", { name: /Avec vue 3D/i });
    await view3dFilter.click();
    await expect(view3dFilter).toHaveAttribute("aria-pressed", "true");

    const signatureTab = page.getByRole("tab", { name: /Plats signatures/i });
    await signatureTab.click();
    await expect(signatureTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-plats-signatures")).toBeVisible();

    await homardLink.click();
    await expect(page).toHaveURL(/\/demo\/dishes\/homard-bisque$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Homard bleu/i })
    ).toBeVisible();
  });

  test("dish page lazy-loads 3D only after intent", async ({ page }) => {
    await stubAnalytics(page);
    const modelRequests: string[] = [];

    await page.route(MODEL_ASSET_PATTERN, async (route) => {
      modelRequests.push(route.request().url());
      await route.abort();
    });

    await expectHealthyResponse(
      await page.goto("/demo/dishes/homard-bisque", {
        waitUntil: "domcontentloaded"
      })
    );

    await expect(
      page.getByRole("heading", { level: 1, name: /Homard bleu/i })
    ).toBeVisible();
    await expect(page.getByText(/104\s?\$/)).toBeVisible();
    await expect(page.getByText(/Bisque maison/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Ingr/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Allerg/i })
    ).toBeVisible();

    const view3d = page.getByRole("button", { name: "Voir en 3D" });
    await expect(view3d).toBeVisible();
    await expect(view3d).toBeEnabled();
    await expect(page.locator("model-viewer")).toHaveCount(0);
    await expect(page.locator("#plat-3d")).toHaveCount(0);
    await expect(page.locator('a[rel="ar"][href$=".usdz"]')).toHaveCount(0);
    await expect(
      page.locator('link[data-vistaire-quicklook-prefetch="true"]')
    ).toHaveCount(0);
    expect(modelRequests).toEqual([]);

    await view3d.scrollIntoViewIfNeeded();
    await view3d.click();

    const plat3d = page.locator("#plat-3d");
    await expect(plat3d).toBeVisible({ timeout: 15_000 });
    await expect(
      plat3d.locator("model-viewer, [role='status']").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("admin demo is public, noindex, and independent from live secrets", async ({
    page
  }) => {
    await stubAnalytics(page);

    await expectHealthyResponse(
      await page.goto("/admin", { waitUntil: "domcontentloaded" })
    );

    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Lecture restaurateur/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Lecture rapide du service/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Votre analyste Vistaire/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Ce qui attire les clients/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Recherches et moments cl.s/i })
    ).toBeVisible();

    const metrics = page.locator(
      'section[aria-labelledby="quick-view-heading"] article'
    );
    expect(await metrics.count()).toBeGreaterThanOrEqual(4);
    await expect(
      page.getByRole("link", { name: /Explorer la carte/i })
    ).toHaveAttribute("href", "/demo");
    await expect(
      page.locator('meta[name="robots"]')
    ).toHaveAttribute("content", /noindex/i);

    await page.getByRole("button", { name: /Lire les signaux/i }).click();
    await expect(page.getByText(/Posez une question courte/i)).toBeVisible();
  });

  test("owner surfaces stay protected for signed-out visitors", async ({
    request
  }, testInfo) => {
    const ownerResponse = await request.get("/owner", {
      maxRedirects: 0,
      headers: { accept: "text/html" }
    });
    expect([302, 307, 308]).toContain(ownerResponse.status());

    const location = ownerResponse.headers().location;
    expect(location).toBeTruthy();
    const baseURL = String(testInfo.project.use.baseURL ?? "http://localhost:3000");
    const redirectPath = new URL(location!, baseURL).pathname;
    expect(redirectPath).toMatch(SIGNED_OUT_AUTH_TARGET_PATTERN);

    const protectedResponses = await Promise.all([
      request.get("/api/restaurants", {
        maxRedirects: 0,
        headers: { accept: "text/html" }
      }),
      request.get(`/api/analytics/summary?restaurantId=${DEMO_RESTAURANT_ID}`, {
        maxRedirects: 0,
        headers: { accept: "text/html" }
      }),
      request.get("/api/owner/insights", {
        maxRedirects: 0,
        headers: { accept: "text/html" }
      })
    ]);

    for (const response of protectedResponses) {
      expect([302, 307, 308]).toContain(response.status());
      const protectedLocation = response.headers().location;
      expect(protectedLocation).toBeTruthy();
      expect(new URL(protectedLocation!, baseURL).pathname).toMatch(
        SIGNED_OUT_AUTH_TARGET_PATTERN
      );
    }
  });
});
