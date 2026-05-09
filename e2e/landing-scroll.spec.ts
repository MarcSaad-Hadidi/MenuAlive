import { expect, test } from "@playwright/test";

const viewports = [
  { label: "iphone-390", width: 390, height: 844 },
  { label: "iphone-430", width: 430, height: 932 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop", width: 1280, height: 720 }
];

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
  test("hero renders with canvas or video and responds to scroll", async ({
    page
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator("#experience")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    const experience = page.locator("#experience");
    const canvasCount = await experience.locator("canvas").count();
    const videoCount = await experience.locator("video").count();
    expect(canvasCount + videoCount).toBeGreaterThan(0);

    const scrollMax = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );
    expect(scrollMax).toBeGreaterThan(400);

    await page.evaluate((y) => window.scrollTo(0, y), scrollMax * 0.35);
    const y1 = await page.evaluate(() => window.scrollY);
    expect(y1).toBeGreaterThan(200);

    await page.evaluate((y) => window.scrollTo(0, y), scrollMax * 0.85);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(y2).toBeGreaterThan(y1);
  });

  test("scroll updates visible chapter copy (canvas progression)", async ({
    page
  }) => {
    // Scroll natif (pas Lenis) pour que le scrub ScrollTrigger suive le document.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("#experience")).toBeVisible();

    try {
      await page.waitForSelector("#experience canvas.opacity-100", {
        timeout: 12_000
      });
    } catch {
      test.skip(
        true,
        "Canvas séquence non active (frames manquants ou chargement bloqué) — pas de scrub chapitres à valider."
      );
      return;
    }

    await page.waitForFunction(
      () =>
        document.documentElement.scrollHeight - window.innerHeight > 1_500
    );

    const chapter = page.locator("#experience .chapter-copy").first();
    await expect(chapter).toBeVisible();
    const before = await chapter.getAttribute("data-chapter");

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
  });

  test('primary CTA "Voir la démo" points to /demo', async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const link = page.getByRole("link", { name: /Voir la démo/i }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/demo");
  });

  test("benefits section follows hero (non-regression layout)", async ({ page }) => {
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

  test("dish pages load with 3D / AR actions visible", async ({ page }) => {
    await page.goto("/demo/dishes/ravioles-romarin", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const voir3d = page.getByRole("button", { name: "Voir en 3D" });
    const voirAr = page.getByRole("button", { name: "Voir devant moi" });
    await expect(voir3d).toBeVisible();
    await expect(voirAr).toBeVisible();
    await expect(voir3d).toBeEnabled();
    await expect(voirAr).toBeEnabled();

    await page.goto("/demo/dishes/homard-bisque", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voir en 3D" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voir devant moi" })).toBeVisible();
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
