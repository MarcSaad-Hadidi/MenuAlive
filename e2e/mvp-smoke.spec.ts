import { expect, type Page, test } from "@playwright/test";

const DESKTOP_HERO_VIDEO =
  "/videos/optimized/upscaled-video-desktop-scrub.mp4";
const MOBILE_HERO_VIDEO = "/videos/optimized/upscaled-video-mobile-scrub.mp4";
const DEMO_RESTAURANT_ID = "11111111-1111-1111-1111-111111111111";
const MODEL_ASSET_RE = /\.(?:glb|usdz)(?:$|[?#])/i;
const HERO_VIDEO_RE = /\/videos\/optimized\/.*\.mp4(?:$|[?#])/i;
const OLD_RAVIOLES_USDZ = "/models/demo/ravioles-chevre-miel.usdz";

type PageHealth = {
  expectClean: () => void;
  networkIssues: string[];
  consoleErrors: string[];
};

type StatusResponse = {
  status: () => number;
};

function isRedirectStatus(status: number) {
  return [302, 303, 307, 308].includes(status);
}

function expectNotSuccessfulStatus(status: number) {
  expect(status < 200 || status >= 300).toBe(true);
}

function shouldTrackPageUrl(page: Page, url: string) {
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;

  try {
    const target = new URL(url);
    const currentUrl = page.url();
    if (!currentUrl.startsWith("http")) return true;

    return target.origin === new URL(currentUrl).origin;
  } catch {
    return true;
  }
}

function installPageHealth(page: Page): PageHealth {
  const networkIssues: string[] = [];
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (text.includes("Failed to load resource")) return;
    consoleErrors.push(text);
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  page.on("response", (response) => {
    const url = response.url();
    if (!shouldTrackPageUrl(page, url)) return;

    const status = response.status();
    if (status === 404 || status >= 500) {
      networkIssues.push(`${status} ${url}`);
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? "request failed";

    if (failure === "net::ERR_ABORTED") return;
    if (!shouldTrackPageUrl(page, url)) return;
    networkIssues.push(`${failure} ${url}`);
  });

  return {
    consoleErrors,
    networkIssues,
    expectClean() {
      expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
      expect(networkIssues, networkIssues.join("\n")).toEqual([]);
    }
  };
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

function collectModelAssetRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    const pathname = new URL(url).pathname;

    if (MODEL_ASSET_RE.test(pathname)) {
      requests.push(url);
    }
  });

  return requests;
}

function collectHeroVideoRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (HERO_VIDEO_RE.test(url)) {
      requests.push(url);
    }
  });

  return requests;
}

async function expectHealthyResponse(response: StatusResponse | null) {
  expect(response, "route should return a response").not.toBeNull();
  expect(response?.status()).toBeLessThan(400);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(2);
}

async function expectHeroVideoReady(page: Page, expectedSource: string) {
  const experience = page.locator("#experience");
  const video = experience.locator("video.hero-video-media");

  await expect(experience).toHaveAttribute(
    "data-hero-engine",
    "video-scroll-scrub"
  );
  await expect(experience).toHaveAttribute("data-video-source", expectedSource);
  await expect(experience).toHaveAttribute("data-video-failed", "false");
  await expect(video).toBeVisible();

  await expect
    .poll(
      () => video.evaluate((element) => (element as HTMLVideoElement).currentSrc),
      { timeout: 30_000 }
    )
    .toContain(expectedSource);
  await expect
    .poll(
      () => video.evaluate((element) => (element as HTMLVideoElement).readyState),
      { timeout: 30_000 }
    )
    .toBeGreaterThanOrEqual(1);
  await expect
    .poll(
      () =>
        experience.evaluate((element) => ({
          deferred: element.getAttribute("data-video-deferred"),
          ready: element.getAttribute("data-video-ready"),
          readyState:
            element.querySelector("video") instanceof HTMLVideoElement
              ? element.querySelector("video")?.readyState
              : 0
        })),
      { timeout: 30_000 }
    )
    .toEqual(expect.objectContaining({ deferred: "false" }));
}

async function expectHeroScrollAdvances(page: Page) {
  const video = page.locator("#experience video.hero-video-media");
  const before = await video.evaluate(
    (element) => (element as HTMLVideoElement).currentTime
  );

  const scrollTarget = await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(420, Math.floor(max * 0.55));
  });

  await page.evaluate((target) => {
    window.scrollTo({ top: target, behavior: "auto" });
    window.dispatchEvent(new Event("scroll"));
  }, scrollTarget);

  await expect
    .poll(
      () =>
        video.evaluate((element) => (element as HTMLVideoElement).currentTime),
      { timeout: 15_000 }
    )
    .toBeGreaterThan(before + 0.01);
}

async function openDish3d(page: Page) {
  const view3d = page.getByRole("button", { name: "Voir en 3D" });

  await expect(view3d).toBeVisible();
  await expect(view3d).toBeEnabled();
  await expect(page.locator("model-viewer")).toHaveCount(0);
  await view3d.scrollIntoViewIfNeeded();
  await view3d.click();
  await expect(page.locator("model-viewer")).toHaveCount(1, {
    timeout: 15_000
  });
}

test.describe("Vistaire MVP smoke", () => {
  test("landing keeps the desktop always-video hero healthy", async ({
    page
  }) => {
    const health = installPageHealth(page);
    const modelRequests = collectModelAssetRequests(page);
    const heroRequests = collectHeroVideoRequests(page);

    await stubAnalytics(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await expectHealthyResponse(
      await page.goto("/", { waitUntil: "domcontentloaded" })
    );

    await expect(page.getByText("Vistaire").first()).toBeVisible();
    await expect(page.locator("#experience")).toBeVisible();
    await expect(page.locator("#experience video")).toBeVisible();
    await expect(page.locator("#experience canvas")).toHaveCount(0);
    await expect(page.locator("#benefices")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Explorer/i }).first()
    ).toHaveAttribute("href", "/demo");

    await expectHeroVideoReady(page, DESKTOP_HERO_VIDEO);
    await expectHeroScrollAdvances(page);

    expect(heroRequests.some((url) => url.includes(DESKTOP_HERO_VIDEO))).toBe(
      true
    );
    expect(heroRequests.some((url) => url.includes(MOBILE_HERO_VIDEO))).toBe(
      false
    );
    expect(modelRequests).toEqual([]);
    await expectNoHorizontalOverflow(page);
    health.expectClean();
  });

  for (const viewport of [
    { label: "375", width: 375, height: 812 },
    { label: "390", width: 390, height: 844 },
    { label: "430", width: 430, height: 932 }
  ]) {
    test(`landing mobile ${viewport.label}px uses only the mobile hero video`, async ({
      page
    }) => {
      const health = installPageHealth(page);
      const heroRequests = collectHeroVideoRequests(page);
      const modelRequests = collectModelAssetRequests(page);

      await stubAnalytics(page);
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });
      await expectHealthyResponse(
        await page.goto("/", { waitUntil: "domcontentloaded" })
      );

      const experience = page.locator("#experience");
      await expect(experience).toHaveAttribute(
        "data-landing-hero-mode",
        "mobile"
      );
      await expectHeroVideoReady(page, MOBILE_HERO_VIDEO);
      await expect(
        page.getByRole("link", { name: /Explorer/i }).first()
      ).toBeVisible();

      expect(heroRequests.some((url) => url.includes(MOBILE_HERO_VIDEO))).toBe(
        true
      );
      expect(heroRequests.some((url) => url.includes(DESKTOP_HERO_VIDEO))).toBe(
        false
      );
      expect(modelRequests).toEqual([]);
      await expectNoHorizontalOverflow(page);
      health.expectClean();
    });
  }

  test("demo menu loads, filters, searches, and avoids early model assets", async ({
    page
  }) => {
    const health = installPageHealth(page);
    const modelRequests = collectModelAssetRequests(page);

    await stubAnalytics(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectHealthyResponse(
      await page.goto("/demo", { waitUntil: "domcontentloaded" })
    );

    await expect(page.locator("[data-demo-root]").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Maison/i })
    ).toBeVisible();
    await expect(
      page.locator('section[aria-label="Carte du restaurant"]')
    ).toBeVisible();

    const search = page.getByLabel(/Rechercher un plat ou un ingr/i);
    await expect(search).toBeVisible();
    await search.fill("homard");

    const homardLink = page.getByRole("link", {
      name: /Voir le plat.*Homard/i
    });
    await expect(homardLink).toBeVisible();

    await search.fill("");
    const view3dFilter = page.getByRole("button", { name: /3D|Avec vue 3D/i });
    await view3dFilter.click();
    await expect(view3dFilter).toHaveAttribute("aria-pressed", "true");

    expect(modelRequests).toEqual([]);
    await expectNoHorizontalOverflow(page);
    health.expectClean();

    await homardLink.click();
    await expect(page).toHaveURL(/\/demo\/dishes\/homard-bisque$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("homard dish loads 3D only after user intent", async ({ page }) => {
    const health = installPageHealth(page);
    const modelRequests = collectModelAssetRequests(page);

    await stubAnalytics(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectHealthyResponse(
      await page.goto("/demo/dishes/homard-bisque", {
        waitUntil: "domcontentloaded"
      })
    );

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/\$\s*$|CAD/i).first()).toBeVisible();
    await expect(page.getByText(/Bisque/i).first()).toBeVisible();
    await expect(page.locator('a[rel="ar"][href$=".usdz"]')).toHaveCount(0);
    await expect(page.locator("model-viewer")).toHaveCount(0);
    expect(modelRequests).toEqual([]);
    await expectNoHorizontalOverflow(page);

    await openDish3d(page);
    await expect
      .poll(() =>
        modelRequests.some((url) => {
          const pathname = new URL(url).pathname;
          return pathname.endsWith(".glb") && pathname.includes("homard-bisque");
        })
      )
      .toBe(true);
    expect(
      modelRequests.some((url) => new URL(url).pathname.endsWith(".usdz"))
    ).toBe(false);
    health.expectClean();
  });

  test("ravioles dish route is stable and does not request the removed USDZ", async ({
    page
  }) => {
    const health = installPageHealth(page);
    const modelRequests = collectModelAssetRequests(page);

    await stubAnalytics(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectHealthyResponse(
      await page.goto("/demo/dishes/ravioles-romarin", {
        waitUntil: "domcontentloaded"
      })
    );

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voir en 3D" })).toBeVisible();
    await expect(page.locator("model-viewer")).toHaveCount(0);
    expect(modelRequests).toEqual([]);

    await openDish3d(page);
    await expect
      .poll(() =>
        modelRequests.some((url) => {
          const pathname = new URL(url).pathname;
          return pathname.endsWith(".glb") && pathname.includes("ravioles");
        })
      )
      .toBe(true);
    expect(
      modelRequests.some((url) =>
        new URL(url).pathname.endsWith(OLD_RAVIOLES_USDZ)
      )
    ).toBe(false);
    expect(
      health.networkIssues.some((issue) => issue.includes(OLD_RAVIOLES_USDZ))
    ).toBe(false);
    health.expectClean();
  });

  test("admin preview stays public and renders restaurant insight content", async ({
    page
  }) => {
    const health = installPageHealth(page);

    await stubAnalytics(page);
    await expectHealthyResponse(
      await page.goto("/admin?restaurantId=not-demo", {
        waitUntil: "domcontentloaded"
      })
    );

    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Lecture rapide du service/i)).toBeVisible();
    await expect(page.getByText(/Assistant Vistaire/i)).toBeVisible();
    await expect(page.getByText(/Recherches et moments/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Explorer le menu client/i })
    ).toHaveAttribute("href", "/demo");
    expect(
      await page
        .locator('section[aria-labelledby="quick-view-heading"] article')
        .count()
    ).toBeGreaterThanOrEqual(4);
    await expectNoHorizontalOverflow(page);
    health.expectClean();
  });

  test("owner route and private owner APIs stay protected when signed out", async ({
    request
  }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? "http://localhost:3000");
    const ownerResponse = await request.get("/owner", {
      maxRedirects: 0,
      headers: { accept: "text/html" }
    });

    expectNotSuccessfulStatus(ownerResponse.status());
    const location = ownerResponse.headers().location;
    if (isRedirectStatus(ownerResponse.status())) {
      expect(location).toBeTruthy();
      expect(new URL(location!, baseURL).pathname).toMatch(/^\/sign-in/);
    }
    const ownerBody = await ownerResponse.text();
    expect(ownerBody).not.toContain("Pilotage Vistaire");
    expect(ownerBody).not.toContain("Restaurants total");

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
      expectNotSuccessfulStatus(response.status());
      const protectedLocation = response.headers().location;
      if (isRedirectStatus(response.status())) {
        expect(protectedLocation).toBeTruthy();
        expect(new URL(protectedLocation!, baseURL).pathname).toMatch(
          /^\/sign-in/
        );
      }
    }
  });

  test("existing metadata routes respond for robots and sitemap", async ({
    request
  }) => {
    const robots = await request.get("/robots.txt");
    const sitemap = await request.get("/sitemap.xml");

    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap:");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
  });
});
