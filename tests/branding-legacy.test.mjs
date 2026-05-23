import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

test("public debug globals use Vistaire branding only", () => {
  const files = [
    join(ROOT, "components", "landing", "ScrollScrubVideoHero.tsx"),
    join(ROOT, "components", "landing", "DesktopLandingHero.tsx")
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("__MENUALIVE_SCROLL_DEBUG__"), false, file);
    assert.equal(source.includes("__VISTAIRE_SCROLL_DEBUG__"), true, file);
  }
});

test("public copy does not expose legacy MenuVivant wording", () => {
  const files = [
    join(ROOT, "components", "DemoRequestSection.tsx"),
    join(ROOT, "components", "SiteFooter.tsx"),
    join(ROOT, "lib", "videoChapters.ts"),
    join(ROOT, "lib", "seoPages.ts")
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(/menu\s+vivant/i.test(source), false, file);
  }
});
