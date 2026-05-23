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
  const legacyDebugGlobal = ["__MENU", "ALIVE_SCROLL_DEBUG__"].join("");

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes(legacyDebugGlobal), false, file);
    assert.equal(source.includes("__VISTAIRE_SCROLL_DEBUG__"), true, file);
  }
});

test("public copy does not expose legacy brand wording", () => {
  const files = [
    join(ROOT, "components", "DemoRequestSection.tsx"),
    join(ROOT, "components", "SiteFooter.tsx"),
    join(ROOT, "lib", "videoChapters.ts"),
    join(ROOT, "lib", "seoPages.ts")
  ];
  const legacyPublicCopyPattern = new RegExp(["menu", "\\s+", "vivant"].join(""), "i");

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(legacyPublicCopyPattern.test(source), false, file);
  }
});

test("landing frame requests use the Vistaire public path alias", () => {
  const legacyFrameSegment = ["menu", "alive"].join("").toLowerCase();
  const oldFramePath = ["/frames/", legacyFrameSegment, "/"].join("");
  const visibleFramePath = "/frames/vistaire/";
  const files = [
    join(ROOT, "app", "globals.css"),
    join(ROOT, "components", "landing", "heroVideoSources.ts")
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes(oldFramePath), false, file);
    assert.equal(source.includes(visibleFramePath), true, file);
  }
});

test("frame alias preserves the retained legacy frame directory", () => {
  const legacyFrameSegment = ["menu", "alive"].join("").toLowerCase();
  const nextConfig = readFileSync(join(ROOT, "next.config.ts"), "utf8");
  const frameConfig = readFileSync(join(ROOT, "lib", "frameConfig.ts"), "utf8");

  assert.equal(nextConfig.includes('source: "/frames/vistaire/:path*"'), true);
  assert.equal(
    nextConfig.includes(`destination: "/frames/${legacyFrameSegment}/:path*"`),
    true
  );
  assert.equal(frameConfig.includes('PUBLIC_FRAMES_PATH_SEGMENT = "vistaire"'), true);
  assert.equal(frameConfig.includes(legacyFrameSegment), false);
});
