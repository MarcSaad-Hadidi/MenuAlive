import { chromium } from "playwright";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";

import { parseArgs, writeStdout } from "./file-utils.mjs";
import { analyzeGlbGeometryFile } from "./geometry-metrics.mjs";
import { comparePngImages, encodePngImage, parsePngImage } from "./png-image.mjs";

export const STRICT_VISUAL_PROMISE =
  "visually indistinguishable under deterministic multi-angle mobile dining-distance review within strict thresholds";

export const STRICT_VISUAL_THRESHOLDS = Object.freeze({
  meanSsim: 0.985,
  perceptualScore: 0.98,
  maxDiffRatio: 0.004,
  maxSilhouetteDiff: 0.002,
  maxColorDelta: 0.015,
  maxTextureBlurDelta: 0.02,
  maxMaterialDrift: 0.02,
  maxScaleDriftMeters: 0.003,
  maxOriginDriftMeters: 0.003,
  maxLowPolyVisibility: 0.01,
  minAppetitePreservation: 0.98
});

export const VISUAL_ANGLES = Object.freeze([
  { key: "front", cameraOrbit: "0deg 68deg 0.95m", cameraTarget: "0m 0.04m 0m", fieldOfView: "24deg" },
  { key: "left", cameraOrbit: "-90deg 68deg 0.95m", cameraTarget: "0m 0.04m 0m", fieldOfView: "24deg" },
  { key: "right", cameraOrbit: "90deg 68deg 0.95m", cameraTarget: "0m 0.04m 0m", fieldOfView: "24deg" },
  { key: "top", cameraOrbit: "0deg 8deg 1.05m", cameraTarget: "0m 0.03m 0m", fieldOfView: "26deg" },
  { key: "three-quarter", cameraOrbit: "35deg 62deg 0.9m", cameraTarget: "0m 0.04m 0m", fieldOfView: "24deg" },
  { key: "close-up-signature", cameraOrbit: "24deg 65deg 0.62m", cameraTarget: "0m 0.045m 0m", fieldOfView: "22deg" },
  { key: "table-distance", cameraOrbit: "-28deg 70deg 1.25m", cameraTarget: "0m 0.04m 0m", fieldOfView: "28deg" },
  { key: "mobile-distance", cameraOrbit: "18deg 66deg 1m", cameraTarget: "0m 0.04m 0m", fieldOfView: "30deg" }
]);

const ALLOWED_VARIANTS = new Set(["web", "mobile", "arLite"]);
const RENDER_ORIGIN = "https://vistaire-render.local";
const RENDER_WIDTH = 512;
const RENDER_HEIGHT = 512;
const BACKGROUND_RGB = [16, 16, 14];

function ensureParent(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fileHash(filePath) {
  return sha256(readFileSync(filePath));
}

function safeResolveExistingFile(value, label) {
  const filePath = normalize(resolve(String(value ?? "")));
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`${label} must point to an existing file`);
  }
  return filePath;
}

function isInside(rootDir, fullPath) {
  const root = normalize(resolve(rootDir));
  const target = normalize(resolve(fullPath));
  return target === root || target.startsWith(`${root}${sep}`);
}

function safeOutputDir(value, label, rootDir) {
  const out = normalize(resolve(String(value ?? "")));
  if (!out) throw new Error(`${label} is required`);
  const reportsRoot = normalize(resolve(rootDir, "assets", "3d", "reports"));
  if (!isInside(reportsRoot, out)) {
    throw new Error(`${label} must be under assets/3d/reports so generated visual artifacts stay out of public and Git`);
  }
  return out;
}

function cleanVariant(value) {
  const variant = String(value ?? "").trim();
  if (!ALLOWED_VARIANTS.has(variant)) {
    throw new Error(`--variant must be one of ${[...ALLOWED_VARIANTS].join(", ")}`);
  }
  return variant;
}

function relativeArtifact(filePath, rootDir) {
  const root = normalize(resolve(rootDir));
  const fullPath = normalize(resolve(filePath));
  const rel = relative(root, fullPath).replaceAll("\\", "/");
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) {
    return fullPath.replaceAll("\\", "/");
  }
  return rel;
}

export function imageReference(filePath, rootDir) {
  const bytes = readFileSync(filePath);
  const image = parsePngImage(bytes);
  return {
    path: relativeArtifact(filePath, rootDir),
    sha256: sha256(bytes),
    width: image.width,
    height: image.height
  };
}

function fileReference(filePath, rootDir) {
  const bytes = readFileSync(filePath);
  return {
    path: relativeArtifact(filePath, rootDir),
    sha256: sha256(bytes)
  };
}

function geometrySummary(filePath) {
  const geometry = analyzeGlbGeometryFile(filePath);
  return {
    ...geometry.bounds,
    components: geometry.components,
    tinyIslandCount: geometry.tinyIslandCount,
    duplicateShellEstimate: geometry.duplicateShellEstimate
  };
}

function maxAbsoluteDelta(a, b) {
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
}

function htmlForRender({ modelUrl, angle }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <style>
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: rgb(${BACKGROUND_RGB.join(",")}); }
      #frame { width: ${RENDER_WIDTH}px; height: ${RENDER_HEIGHT}px; background: rgb(${BACKGROUND_RGB.join(",")}); }
      model-viewer { width: 100%; height: 100%; background: rgb(${BACKGROUND_RGB.join(",")}); --poster-color: rgb(${BACKGROUND_RGB.join(",")}); }
    </style>
    <script>
      window.ModelViewerElement = {
        ...(window.ModelViewerElement || {}),
        meshoptDecoderLocation: "${RENDER_ORIGIN}/meshopt-decoder.js"
      };
    </script>
    <script type="module" src="${RENDER_ORIGIN}/model-viewer.min.js"></script>
  </head>
  <body>
    <div id="frame">
      <model-viewer
        id="viewer"
        src="${modelUrl}"
        camera-orbit="${angle.cameraOrbit}"
        camera-target="${angle.cameraTarget}"
        field-of-view="${angle.fieldOfView}"
        min-camera-orbit="${angle.cameraOrbit}"
        max-camera-orbit="${angle.cameraOrbit}"
        exposure="1"
        shadow-intensity="0"
        interaction-prompt="none"
        loading="eager"
        reveal="auto"
        disable-tap
      ></model-viewer>
    </div>
    <script type="module">
      const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      try {
        await customElements.whenDefined("model-viewer");
        const viewer = document.getElementById("viewer");
        const markLoaded = async () => {
          await settle();
          window.__VISTAIRE_RENDER_READY__ = { status: "loaded" };
        };
        const markError = (event) => {
          const detail = event?.detail || {};
          window.__VISTAIRE_RENDER_READY__ = {
            status: "error",
            message:
              detail?.sourceError?.message ||
              detail?.message ||
              detail?.type ||
              event?.message ||
              "model-viewer failed to load"
          };
        };
        viewer.addEventListener("load", markLoaded, { once: true });
        viewer.addEventListener("error", markError, { once: true });
        if (viewer.loaded) await markLoaded();
      } catch (error) {
        window.__VISTAIRE_RENDER_READY__ = { status: "error", message: error.message };
      }
    </script>
  </body>
</html>`;
}

async function routeRenderAssets(page, { modelPath, html }) {
  const modelViewerPath = resolve("node_modules", "@google", "model-viewer", "dist", "model-viewer.min.js");
  const meshoptDecoderPath = resolve("public", "model-viewer", "meshopt-decoder-74188840.js");
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === `${RENDER_ORIGIN}/render.html`) {
      await route.fulfill({
        body: html,
        contentType: "text/html; charset=utf-8",
        headers: { "access-control-allow-origin": "*" }
      });
      return;
    }
    if (url === `${RENDER_ORIGIN}/model-viewer.min.js`) {
      await route.fulfill({
        path: modelViewerPath,
        contentType: "text/javascript; charset=utf-8",
        headers: { "access-control-allow-origin": "*" }
      });
      return;
    }
    if (url === `${RENDER_ORIGIN}/meshopt-decoder.js`) {
      await route.fulfill({
        path: meshoptDecoderPath,
        contentType: "text/javascript; charset=utf-8",
        headers: { "access-control-allow-origin": "*" }
      });
      return;
    }
    if (url === `${RENDER_ORIGIN}/model.glb`) {
      await route.fulfill({
        path: modelPath,
        contentType: "model/gltf-binary",
        headers: { "access-control-allow-origin": "*" }
      });
      return;
    }
    if (url.startsWith("data:") || url === "about:blank") {
      await route.continue();
      return;
    }
    await route.abort();
  });
}

export async function renderModelScreenshot({
  browser,
  modelPath,
  outPath,
  angle = VISUAL_ANGLES.find((entry) => entry.key === "three-quarter"),
  width = RENDER_WIDTH,
  height = RENDER_HEIGHT
}) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  try {
    const html = htmlForRender({ modelUrl: `${RENDER_ORIGIN}/model.glb`, angle });
    await routeRenderAssets(page, { modelPath, html });
    await page.goto(`${RENDER_ORIGIN}/render.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => window.__VISTAIRE_RENDER_READY__?.status === "loaded" || window.__VISTAIRE_RENDER_READY__?.status === "error",
      null,
      { timeout: 30_000 }
    );
    const ready = await page.evaluate(() => window.__VISTAIRE_RENDER_READY__);
    if (ready?.status !== "loaded") {
      throw new Error(ready?.message || "model did not finish loading");
    }
    ensureParent(outPath);
    await page.locator("#frame").screenshot({
      path: outPath,
      animations: "disabled",
      scale: "css"
    });
    return imageReference(outPath, process.cwd());
  } finally {
    await page.close();
  }
}

function statusForAngle(metrics) {
  return metrics.ssim >= STRICT_VISUAL_THRESHOLDS.meanSsim &&
    metrics.perceptualScore >= STRICT_VISUAL_THRESHOLDS.perceptualScore &&
    metrics.diffRatio <= STRICT_VISUAL_THRESHOLDS.maxDiffRatio &&
    metrics.silhouetteDiff <= STRICT_VISUAL_THRESHOLDS.maxSilhouetteDiff &&
    metrics.colorDelta <= STRICT_VISUAL_THRESHOLDS.maxColorDelta &&
    metrics.textureBlurDelta <= STRICT_VISUAL_THRESHOLDS.maxTextureBlurDelta &&
    metrics.materialDrift <= STRICT_VISUAL_THRESHOLDS.maxMaterialDrift &&
    metrics.lowPolyVisibilityScore <= STRICT_VISUAL_THRESHOLDS.maxLowPolyVisibility &&
    metrics.appetitePreservationScore >= STRICT_VISUAL_THRESHOLDS.minAppetitePreservation
    ? "passed"
    : "failed";
}

function aggregateReports(angleReports) {
  const mean = (key) => angleReports.reduce((sum, report) => sum + report[key], 0) / angleReports.length;
  const max = (key) => Math.max(...angleReports.map((report) => report[key]));
  return {
    meanSsim: mean("ssim"),
    perceptualScore: mean("perceptualScore"),
    maxDiffRatio: max("maxDiffRatio"),
    maxSilhouetteDiff: max("silhouetteDiff"),
    maxColorDelta: max("colorDelta"),
    maxTextureBlurDelta: max("textureBlurDelta"),
    maxMaterialDrift: max("materialDrift"),
    lowPolyVisibilityScore: max("lowPolyVisibilityScore"),
    appetitePreservationScore: mean("appetitePreservationScore")
  };
}

function checksFor(aggregate) {
  const check = (status, reason) => status ? { status: "passed" } : { status: "failed", reason };
  return {
    textureSharpness: check(aggregate.maxTextureBlurDelta <= STRICT_VISUAL_THRESHOLDS.maxTextureBlurDelta, "Texture blur drift exceeds strict threshold"),
    silhouette: check(aggregate.maxSilhouetteDiff <= STRICT_VISUAL_THRESHOLDS.maxSilhouetteDiff, "Silhouette drift exceeds strict threshold"),
    color: check(aggregate.maxColorDelta <= STRICT_VISUAL_THRESHOLDS.maxColorDelta, "Color drift exceeds strict threshold"),
    material: check(aggregate.maxMaterialDrift <= STRICT_VISUAL_THRESHOLDS.maxMaterialDrift, "Material drift exceeds strict threshold"),
    scaleOrigin: check(
      aggregate.maxScaleDriftMeters <= STRICT_VISUAL_THRESHOLDS.maxScaleDriftMeters &&
        aggregate.maxOriginDriftMeters <= STRICT_VISUAL_THRESHOLDS.maxOriginDriftMeters,
      "Scale or origin drift exceeds strict threshold"
    ),
    lowPoly: check(aggregate.lowPolyVisibilityScore <= STRICT_VISUAL_THRESHOLDS.maxLowPolyVisibility, "Visible low-poly score exceeds strict threshold"),
    appetite: check(aggregate.appetitePreservationScore >= STRICT_VISUAL_THRESHOLDS.minAppetitePreservation, "Appetite preservation score is below strict threshold")
  };
}

function passedAggregate(aggregate, checks) {
  return aggregate.meanSsim >= STRICT_VISUAL_THRESHOLDS.meanSsim &&
    aggregate.perceptualScore >= STRICT_VISUAL_THRESHOLDS.perceptualScore &&
    aggregate.maxDiffRatio <= STRICT_VISUAL_THRESHOLDS.maxDiffRatio &&
    aggregate.maxSilhouetteDiff <= STRICT_VISUAL_THRESHOLDS.maxSilhouetteDiff &&
    aggregate.maxColorDelta <= STRICT_VISUAL_THRESHOLDS.maxColorDelta &&
    aggregate.maxTextureBlurDelta <= STRICT_VISUAL_THRESHOLDS.maxTextureBlurDelta &&
    aggregate.maxMaterialDrift <= STRICT_VISUAL_THRESHOLDS.maxMaterialDrift &&
    aggregate.maxScaleDriftMeters <= STRICT_VISUAL_THRESHOLDS.maxScaleDriftMeters &&
    aggregate.maxOriginDriftMeters <= STRICT_VISUAL_THRESHOLDS.maxOriginDriftMeters &&
    aggregate.lowPolyVisibilityScore <= STRICT_VISUAL_THRESHOLDS.maxLowPolyVisibility &&
    aggregate.appetitePreservationScore >= STRICT_VISUAL_THRESHOLDS.minAppetitePreservation &&
    Object.values(checks).every((entry) => entry.status === "passed");
}

function markdownReport(report) {
  const lines = [
    `# Vistaire 3D Visual Comparison: ${report.variant}`,
    "",
    `- Status: ${report.status}`,
    `- Method: ${report.method}`,
    `- Mean SSIM: ${report.meanSsim.toFixed(6)}`,
    `- Perceptual score: ${report.perceptualScore.toFixed(6)}`,
    `- Max diff ratio: ${report.maxDiffRatio.toFixed(6)}`,
    "",
    "| Angle | SSIM | Perceptual | Diff ratio | Status |",
    "| --- | ---: | ---: | ---: | --- |",
    ...report.angleReports.map((entry) =>
      `| ${entry.angle} | ${entry.ssim.toFixed(6)} | ${entry.perceptualScore.toFixed(6)} | ${entry.maxDiffRatio.toFixed(6)} | ${entry.status} |`
    ),
    "",
    "Manual visual approval and real-device iPhone/Android QA remain separate gates."
  ];
  return `${lines.join("\n")}\n`;
}

export async function runVisualCompare({
  source,
  candidate,
  variant,
  out,
  rootDir = process.cwd()
}) {
  const sourcePath = safeResolveExistingFile(source, "--source");
  const candidatePath = safeResolveExistingFile(candidate, "--candidate");
  const variantKey = cleanVariant(variant);
  const outDir = safeOutputDir(out, "--out", rootDir);
  mkdirSync(outDir, { recursive: true });
  const sourceGeometry = geometrySummary(sourcePath);
  const candidateGeometry = geometrySummary(candidatePath);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--force-color-profile=srgb",
      "--use-angle=swiftshader",
      "--use-gl=angle",
      "--disable-skia-runtime-opts",
      "--disable-smooth-scrolling"
    ]
  });

  const angleReports = [];
  try {
    for (const angle of VISUAL_ANGLES) {
      const beforePath = join(outDir, "before", `${angle.key}.png`);
      const afterPath = join(outDir, "after", `${angle.key}.png`);
      const diffPath = join(outDir, "diff", `${angle.key}.png`);
      await renderModelScreenshot({ browser, modelPath: sourcePath, outPath: beforePath, angle });
      await renderModelScreenshot({ browser, modelPath: candidatePath, outPath: afterPath, angle });
      const beforeImage = parsePngImage(readFileSync(beforePath));
      const afterImage = parsePngImage(readFileSync(afterPath));
      const comparison = comparePngImages(beforeImage, afterImage, {
        background: BACKGROUND_RGB,
        tolerance: 0
      });
      ensureParent(diffPath);
      writeFileSync(diffPath, encodePngImage(comparison.diffImage));
      const metrics = comparison.metrics;
      angleReports.push({
        variant: variantKey,
        angle: angle.key,
        status: statusForAngle(metrics),
        before: imageReference(beforePath, rootDir),
        after: imageReference(afterPath, rootDir),
        diff: imageReference(diffPath, rootDir),
        ssim: metrics.ssim,
        perceptualScore: metrics.perceptualScore,
        maxDiffRatio: metrics.diffRatio,
        silhouetteDiff: metrics.silhouetteDiff,
        colorDelta: metrics.colorDelta,
        brightnessDelta: metrics.brightnessDelta,
        saturationDelta: metrics.saturationDelta,
        edgeSharpnessDelta: metrics.edgeSharpnessDelta,
        textureBlurDelta: metrics.textureBlurDelta,
        materialDrift: metrics.materialDrift,
        objectCoverageDelta: metrics.objectCoverageDelta,
        lowPolyVisibilityScore: metrics.lowPolyVisibilityScore,
        appetitePreservationScore: metrics.appetitePreservationScore
      });
    }
  } finally {
    await browser.close();
  }

  const aggregate = {
    ...aggregateReports(angleReports),
    maxScaleDriftMeters: maxAbsoluteDelta(sourceGeometry.dimensionsMeters, candidateGeometry.dimensionsMeters),
    maxOriginDriftMeters: maxAbsoluteDelta(sourceGeometry.originMeters, candidateGeometry.originMeters)
  };
  const checks = checksFor(aggregate);
  const report = {
    status: passedAggregate(aggregate, checks) ? "passed" : "failed",
    variant: variantKey,
    promise: STRICT_VISUAL_PROMISE,
    method: "deterministic-render-comparison",
    renderer: {
      engine: "playwright-chromium-model-viewer",
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      deviceScaleFactor: 1,
      background: BACKGROUND_RGB
    },
    threshold: "strict",
    thresholds: STRICT_VISUAL_THRESHOLDS,
    source: {
      path: sourcePath.replaceAll("\\", "/"),
      sha256: fileHash(sourcePath),
      bytes: statSync(sourcePath).size,
      geometry: sourceGeometry
    },
    candidate: {
      path: candidatePath.replaceAll("\\", "/"),
      sha256: fileHash(candidatePath),
      bytes: statSync(candidatePath).size,
      geometry: candidateGeometry
    },
    reportArtifacts: {
      [variantKey]: {
        before: angleReports.find((entry) => entry.angle === "front").before,
        after: angleReports.find((entry) => entry.angle === "front").after,
        diff: angleReports.find((entry) => entry.angle === "front").diff
      }
    },
    artifacts: Object.fromEntries(
      angleReports.map((entry) => [
        entry.angle,
        {
          before: entry.before,
          after: entry.after,
          diff: entry.diff
        }
      ])
    ),
    angleReports,
    ...aggregate,
    checks
  };

  const markdownPath = join(outDir, "visual-report.md");
  writeFileSync(markdownPath, markdownReport(report));
  report.report = fileReference(markdownPath, rootDir);
  const jsonPath = join(outDir, "visual-report.json");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  return { ...report, reportJson: fileReference(jsonPath, rootDir) };
}

export async function runVisualCompareCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  let output;
  try {
    output = await runVisualCompare({
      source: args.source,
      candidate: args.candidate,
      variant: args.variant,
      out: args.out,
      rootDir: args.root ?? process.cwd()
    });
    process.exitCode = output.status === "passed" ? 0 : 1;
  } catch (error) {
    output = {
      ok: false,
      name: "3d:visual-compare",
      warnings: [],
      fails: [error instanceof Error ? error.message : String(error)],
      metrics: {},
      evidence: []
    };
    process.exitCode = 1;
  }
  writeStdout(output, Boolean(args.json));
  return output;
}
