import { expect, test, type Locator, type Page } from "@playwright/test";

const DESKTOP_HERO_VIDEO =
  "/videos/optimized/upscaled-video-desktop-scrub.mp4";
const MOBILE_HERO_VIDEO = "/videos/optimized/upscaled-video-mobile-scrub.mp4";
const HERO_VIDEO_REQUEST_RE = /\/videos\/optimized\/.*\.mp4(?:$|\?)/i;
const MODEL_ASSET_REQUEST_RE =
  /\.(?:glb|usdz)(?:$|\?)|raw\.githubusercontent\.com|githubusercontent/i;

const viewports = [
  { label: "iphone-375", width: 375, height: 812 },
  { label: "iphone-390", width: 390, height: 844 },
  { label: "iphone-430", width: 430, height: 932 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop", width: 1280, height: 720 }
];

const mobileHeroSourceViewports = [
  { label: "iphone-375", width: 375, height: 812 },
  { label: "iphone-390", width: 390, height: 844 },
  { label: "iphone-430", width: 430, height: 932 }
];

function collectHeroVideoRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();

    if (HERO_VIDEO_REQUEST_RE.test(url)) {
      requests.push(url);
    }
  });

  return requests;
}

function collectModelAssetRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();

    if (MODEL_ASSET_REQUEST_RE.test(url)) {
      requests.push(url);
    }
  });

  return requests;
}

async function expectHeroVideoLoaded(
  experience: Locator,
  expectedSource: string
) {
  const video = experience.locator("video");

  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentSrc)
    )
    .toContain(expectedSource);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).readyState)
    )
    .toBeGreaterThanOrEqual(1);
  await expect(experience).toHaveAttribute("data-video-ready", "true", {
    timeout: 15_000
  });
  await expect(experience.locator(".hero-video-poster")).toHaveClass(
    /opacity-0/
  );
}

async function expectHeroScrollChangesVideoTime(
  page: Page,
  experience: Locator,
  minDelta = 0.05
) {
  const video = experience.locator("video");
  const before = await video.evaluate(
    (element) => (element as HTMLVideoElement).currentTime
  );
  const scrollMax = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );

  await page.evaluate((target) => {
    window.scrollTo({ top: target, behavior: "auto" });
    window.dispatchEvent(new Event("scroll"));
  }, Math.max(400, Math.floor(scrollMax * 0.55)));

  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime)
    )
    .toBeGreaterThan(before + minDelta);
}

test.describe("Landing responsive", () => {
  for (const vp of viewports) {
    test(`no horizontal overflow at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const gap = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(gap).toBeLessThanOrEqual(2);
    });
  }
});

test.describe("Landing scroll experience", () => {
  test("hero renders desktop video and responds to scroll", async ({ page }) => {
    const frameRequests: string[] = [];
    const heroVideoRequests = collectHeroVideoRequests(page);
    const modelAssetRequests = collectModelAssetRequests(page);
    const videoResponseStatuses: number[] = [];

    page.on("request", (request) => {
      if (/\/frames\/|frame_\d{4}\.webp/i.test(request.url())) {
        frameRequests.push(request.url());
      }
    });
    page.on("response", (response) => {
      if (response.url().includes(DESKTOP_HERO_VIDEO)) {
        videoResponseStatuses.push(response.status());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#experience")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    const experience = page.locator("#experience");
    await expect(experience.locator("video")).toBeVisible();
    await expect(experience.locator("canvas")).toHaveCount(0);
    await expect(experience).toHaveAttribute(
      "data-landing-hero-mode",
      "desktopHigh"
    );
    await expect(experience).toHaveAttribute(
      "data-video-source",
      DESKTOP_HERO_VIDEO
    );
    expect(frameRequests.length).toBeLessThanOrEqual(1);

    const scrollMax = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );
    expect(scrollMax).toBeGreaterThan(400);

    await expectHeroVideoLoaded(experience, DESKTOP_HERO_VIDEO);

    await expect
      .poll(() =>
        videoResponseStatuses.some(
          (status) => status === 200 || status === 206
        )
      )
      .toBe(true);

    const videoNetworkState = await experience
      .locator("video")
      .evaluate((video) => {
        const element = video as HTMLVideoElement;
        return {
          currentSrc: element.currentSrc,
          errorCode: element.error?.code ?? null,
          networkState: element.networkState
        };
      });
    expect(videoNetworkState.currentSrc).toContain(DESKTOP_HERO_VIDEO);
    expect(videoNetworkState.errorCode).toBeNull();
    expect(heroVideoRequests.some((url) => url.includes(DESKTOP_HERO_VIDEO))).toBe(
      true
    );
    expect(heroVideoRequests.some((url) => url.includes(MOBILE_HERO_VIDEO))).toBe(
      false
    );
    expect(modelAssetRequests).toEqual([]);

    await expectHeroScrollChangesVideoTime(page, experience, 0.1);
  });

  test("scroll updates visible chapter copy and video time", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#experience")).toBeVisible();
    await expect(page.locator("#experience video")).toBeVisible();

    await page.waitForFunction(
      () => document.documentElement.scrollHeight - window.innerHeight > 1_500
    );

    const chapter = page.locator("#experience .chapter-copy").first();
    await expect(chapter).toBeVisible();
    const before = await chapter.getAttribute("data-chapter");
    const videoBefore = await page
      .locator("#experience video")
      .evaluate((video) => (video as HTMLVideoElement).currentTime);

    const { scrollYAfter, scrollMax } = await page.evaluate(() => {
      const scrollMaxVal =
        document.documentElement.scrollHeight - window.innerHeight;
      const target = Math.max(0, Math.floor(scrollMaxVal * 0.92));
      window.scrollTo({ top: target, behavior: "auto" });
      window.dispatchEvent(new Event("scroll"));
      return { scrollYAfter: window.scrollY, scrollMax: scrollMaxVal };
    });
    expect(scrollMax).toBeGreaterThan(1_500);
    expect(scrollYAfter).toBeGreaterThan(400);

    await expect(chapter).not.toHaveAttribute("data-chapter", before ?? "", {
      timeout: 10_000
    });
    await expect
      .poll(async () =>
        page
          .locator("#experience video")
          .evaluate((video) => (video as HTMLVideoElement).currentTime)
      )
      .toBeGreaterThan(videoBefore + 0.1);
  });

  for (const vp of mobileHeroSourceViewports) {
    test(`mobile viewport ${vp.label} uses only the mobile scrub video`, async ({
      page
    }) => {
      const heroVideoRequests = collectHeroVideoRequests(page);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "deviceMemory", {
          configurable: true,
          get: () => 2
        });
        Object.defineProperty(navigator, "hardwareConcurrency", {
          configurable: true,
          get: () => 4
        });
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          get: () => ({ effectiveType: "3g", saveData: false })
        });
      });

      await page.goto("/", { waitUntil: "domcontentloaded" });

      const experience = page.locator("#experience");
      await expect(experience).toBeVisible();
      await expect(experience).toHaveAttribute(
        "data-landing-hero-mode",
        "mobile"
      );
      await expect(experience).toHaveAttribute(
        "data-video-source",
        MOBILE_HERO_VIDEO
      );
      await expect(experience).toHaveAttribute("data-low-end-device", "true");

      await expectHeroVideoLoaded(experience, MOBILE_HERO_VIDEO);
      expect(heroVideoRequests.some((url) => url.includes(MOBILE_HERO_VIDEO))).toBe(
        true
      );
      expect(
        heroVideoRequests.some((url) => url.includes(DESKTOP_HERO_VIDEO))
      ).toBe(false);
    });
  }

  test("low-end desktop still uses and scrubs the desktop video", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "deviceMemory", {
        configurable: true,
        get: () => 2
      });
      Object.defineProperty(navigator, "hardwareConcurrency", {
        configurable: true,
        get: () => 4
      });
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        get: () => ({ effectiveType: "3g", saveData: false })
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const experience = page.locator("#experience");
    await expect(experience).toBeVisible();
    await expect(experience).toHaveAttribute(
      "data-landing-hero-mode",
      "desktopHigh"
    );
    await expect(experience).toHaveAttribute(
      "data-video-source",
      DESKTOP_HERO_VIDEO
    );
    await expect(experience).toHaveAttribute("data-low-end-device", "true");
    await expect(experience).toHaveAttribute("data-reduced-motion", "false");
    await expect(experience).toHaveAttribute("data-save-data", "false");
    await expect(experience).toHaveAttribute("data-video-failed", "false");
    await expect(experience).toHaveAttribute("data-video-deferred", "false");
    await expect(experience.locator("video")).toHaveJSProperty(
      "preload",
      "metadata"
    );

    await expectHeroVideoLoaded(experience, DESKTOP_HERO_VIDEO);
    await expectHeroScrollChangesVideoTime(page, experience);
  });

  test("desktop touch viewport keeps the desktop scrub video", async ({
    page
  }) => {
    const heroVideoRequests = collectHeroVideoRequests(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "maxTouchPoints", {
        configurable: true,
        get: () => 5
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const experience = page.locator("#experience");
    await expect(experience).toBeVisible();
    await expect(experience).toHaveAttribute(
      "data-landing-hero-mode",
      "desktopHigh"
    );
    await expect(experience).toHaveAttribute(
      "data-video-source",
      DESKTOP_HERO_VIDEO
    );

    await expectHeroVideoLoaded(experience, DESKTOP_HERO_VIDEO);
    expect(heroVideoRequests.some((url) => url.includes(DESKTOP_HERO_VIDEO))).toBe(
      true
    );
    expect(heroVideoRequests.some((url) => url.includes(MOBILE_HERO_VIDEO))).toBe(
      false
    );
  });

  test("save-data keeps the desktop scrub video as the primary hero", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        get: () => ({ effectiveType: "4g", saveData: true })
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const experience = page.locator("#experience");
    await expect(experience).toBeVisible();
    await expect(experience).toHaveAttribute(
      "data-landing-hero-mode",
      "desktopHigh"
    );
    await expect(experience).toHaveAttribute("data-save-data", "true");
    await expect(experience).toHaveAttribute("data-video-failed", "false");
    await expect(experience).toHaveAttribute("data-video-deferred", "false");
    await expect(experience).toHaveAttribute(
      "data-video-source",
      DESKTOP_HERO_VIDEO
    );

    await expectHeroVideoLoaded(experience, DESKTOP_HERO_VIDEO);
  });

  test("save-data keeps the mobile scrub video as the primary hero", async ({
    page
  }) => {
    const heroVideoRequests = collectHeroVideoRequests(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        get: () => ({ effectiveType: "4g", saveData: true })
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const experience = page.locator("#experience");
    await expect(experience).toBeVisible();
    await expect(experience).toHaveAttribute("data-landing-hero-mode", "mobile");
    await expect(experience).toHaveAttribute("data-save-data", "true");
    await expect(experience).toHaveAttribute("data-video-failed", "false");
    await expect(experience).toHaveAttribute("data-video-deferred", "false");
    await expect(experience).toHaveAttribute(
      "data-video-source",
      MOBILE_HERO_VIDEO
    );

    await expectHeroVideoLoaded(experience, MOBILE_HERO_VIDEO);
    await expectHeroScrollChangesVideoTime(page, experience);
    expect(heroVideoRequests.some((url) => url.includes(MOBILE_HERO_VIDEO))).toBe(
      true
    );
    expect(
      heroVideoRequests.some((url) => url.includes(DESKTOP_HERO_VIDEO))
    ).toBe(false);
  });

  test("reduced-motion keeps the desktop scrub video as the primary hero", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const experience = page.locator("#experience");
    await expect(experience).toBeVisible();
    await expect(experience).toHaveAttribute(
      "data-landing-hero-mode",
      "desktopHigh"
    );
    await expect(experience).toHaveAttribute("data-reduced-motion", "true");
    await expect(experience).toHaveAttribute("data-video-failed", "false");
    await expect(experience).toHaveAttribute("data-video-deferred", "false");
    await expect(experience).toHaveAttribute(
      "data-video-source",
      DESKTOP_HERO_VIDEO
    );

    await expectHeroVideoLoaded(experience, DESKTOP_HERO_VIDEO);
    await expectHeroScrollChangesVideoTime(page, experience);
  });

  test("reduced-motion keeps the mobile scrub video as the primary hero", async ({
    page
  }) => {
    const heroVideoRequests = collectHeroVideoRequests(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const experience = page.locator("#experience");
    await expect(experience).toBeVisible();
    await expect(experience).toHaveAttribute("data-landing-hero-mode", "mobile");
    await expect(experience).toHaveAttribute("data-reduced-motion", "true");
    await expect(experience).toHaveAttribute("data-video-failed", "false");
    await expect(experience).toHaveAttribute("data-video-deferred", "false");
    await expect(experience).toHaveAttribute(
      "data-video-source",
      MOBILE_HERO_VIDEO
    );

    await expectHeroVideoLoaded(experience, MOBILE_HERO_VIDEO);
    await expectHeroScrollChangesVideoTime(page, experience);
    expect(heroVideoRequests.some((url) => url.includes(MOBILE_HERO_VIDEO))).toBe(
      true
    );
    expect(
      heroVideoRequests.some((url) => url.includes(DESKTOP_HERO_VIDEO))
    ).toBe(false);
  });

  test("primary CTA points to /demo", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const link = page
      .getByRole("link", { name: /Explorer/i })
      .first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/demo");
  });

  test("primary CTA remains visible on narrow mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const link = page
      .getByRole("link", { name: /Explorer/i })
      .first();

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/demo");
  });

  test("benefits section follows hero as the next landing section", async ({
    page
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#benefices")).toBeVisible();
  });
});

test.describe("Demo mobile", () => {
  test("narrow viewport does not offer desktop phone simulation control", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-demo-root]").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Simuler.*mobile/i })
    ).toHaveCount(0);
  });
});

test.describe("Non-regression routes", () => {
  test("/demo loads", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-demo-root]").first()).toBeVisible();
  });

  test("dish pages load 3D only after user intent", async ({ page }) => {
    const modelAssetRequests = collectModelAssetRequests(page);

    await page.goto("/demo/dishes/ravioles-romarin", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const voir3d = page.getByRole("button", { name: "Voir en 3D" });
    await expect(voir3d).toBeVisible();
    await expect(voir3d).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Afficher devant moi" })
    ).toHaveCount(0);
    await expect(page.locator("model-viewer")).toHaveCount(0);
    expect(modelAssetRequests).toEqual([]);

    await page.goto("/demo/dishes/homard-bisque", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voir en 3D" })).toBeVisible();
    await expect(page.locator("model-viewer")).toHaveCount(0);
    expect(modelAssetRequests).toEqual([]);

    await page.goto("/demo/dishes/ravioles-romarin", {
      waitUntil: "domcontentloaded"
    });
    const loadedVoir3d = page.getByRole("button", { name: "Voir en 3D" });
    await loadedVoir3d.scrollIntoViewIfNeeded();
    await loadedVoir3d.click({ force: true });
    await expect(page.locator("model-viewer")).toHaveCount(1, {
      timeout: 15_000
    });
  });

  test("/admin loads", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/admin", {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
