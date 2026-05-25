import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SEO_PAGE_FILES = {
  "menu-pdf-vs-menu-digital": "components/seo/pages/MenuPdfVsDigitalPage.tsx",
  "menu-digital-restaurant": "components/seo/pages/MenuDigitalRestaurantPage.tsx",
  "menu-qr-code-restaurant": "components/seo/pages/MenuQrCodeRestaurantPage.tsx",
  "menu-3d-ar-restaurant": "components/seo/pages/Menu3dArRestaurantPage.tsx"
};

const FORBIDDEN_HEAVY_REFS = [
  "@google/model-viewer",
  "import { useGLTF",
  "model-viewer",
  ".glb",
  ".usdz",
  ".mp4",
  ".webm",
  "gsap",
  "framer-motion",
  "three"
];

function readSeo(file) {
  return readFileSync(join(process.cwd(), file), "utf8");
}

test("PDF vs digital page hosts the signature comparison slider", () => {
  const file = readSeo(SEO_PAGE_FILES["menu-pdf-vs-menu-digital"]);
  assert.match(
    file,
    /from "@\/components\/seo\/PdfVistaireCompareSlider"/,
    "MenuPdfVsDigitalPage must import PdfVistaireCompareSlider"
  );
  assert.match(
    file,
    /<PdfVistaireCompareSlider\b/,
    "MenuPdfVsDigitalPage must render <PdfVistaireCompareSlider />"
  );
});

test("PDF vs digital page wires slider preview data from the demo menu source", () => {
  const file = readSeo(SEO_PAGE_FILES["menu-pdf-vs-menu-digital"]);
  assert.match(
    file,
    /buildPdfComparePreviewData/,
    "MenuPdfVsDigitalPage must build preview data from demo menu source"
  );
  assert.match(
    file,
    /preview=\{comparePreview\}/,
    "MenuPdfVsDigitalPage must pass comparePreview to the slider"
  );
});

test("Comparison slider stays aligned with demo menu data helpers", () => {
  const sliderPath = "components/seo/PdfVistaireCompareSlider.tsx";
  const file = readSeo(sliderPath);
  assert.match(
    file,
    /preview: PdfComparePreviewData/,
    "slider must accept PdfComparePreviewData from the shared helper"
  );
  assert.match(
    file,
    /CompareDishCardPreview/,
    "slider must render demo-aligned dish card previews"
  );
  assert.doesNotMatch(
    file,
    /dishPrice = "16 \$"/,
    "slider must not keep stale hardcoded demo dish defaults"
  );
});

test("Comparison slider keeps PDF and Vistaire labels inside distinct clipped layers", () => {
  const sliderPath = "components/seo/PdfVistaireCompareSlider.tsx";
  const file = readSeo(sliderPath);
  assert.match(
    file,
    /function PdfLayerLabel/,
    "slider must render the PDF label inside the PDF layer"
  );
  assert.match(
    file,
    /function VistaireLayerLabel/,
    "slider must render the Vistaire label inside the Vistaire layer"
  );
  assert.match(
    file,
    /clipPath: "inset\(0 calc\(100% - var\(--split\)\) 0 0\)"/,
    "PDF layer must clip to the left side of the slider"
  );
  assert.match(
    file,
    /clipPath: "inset\(0 0 0 var\(--split\)\)"/,
    "Vistaire layer must clip to the right side of the slider"
  );
  assert.doesNotMatch(
    file,
    /maison-elyse-carte\.pdf/,
    "slider must not render a PDF filename bar"
  );
  assert.doesNotMatch(
    file,
    /pdfFilename/,
    "slider must not depend on a PDF filename field"
  );
});

test("Comparison slider component declares a client boundary and pillar marker", () => {
  const sliderPath = "components/seo/PdfVistaireCompareSlider.tsx";
  const file = readSeo(sliderPath);
  assert.match(file, /^"use client";/, "slider must opt into a client boundary");
  assert.match(
    file,
    /data-pillar-animation="pdf-vs-digital"/,
    "slider must expose data-pillar-animation marker for QA"
  );
  assert.match(file, /role="slider"/, "slider must expose role=slider");
  assert.match(file, /aria-valuenow/, "slider must expose aria-valuenow");
  assert.match(file, /aria-valuemin=\{0\}/);
  assert.match(file, /aria-valuemax=\{100\}/);
  assert.match(
    file,
    /onKeyDown=\{onKeyDown\}/,
    "slider must wire its keyboard handler"
  );
  assert.match(file, /motion-reduce:/, "slider must respect reduced motion classes");
  assert.match(
    file,
    /data-phone-comparison="true"/,
    "slider must expose phone comparison marker for QA"
  );
  assert.match(
    file,
    /aspect-\[9\/16\]/,
    "slider screen must use phone aspect ratio"
  );
});

test("Signature animations must not pull heavy media or runtime libraries", () => {
  for (const [slug, file] of Object.entries(SEO_PAGE_FILES)) {
    const content = readSeo(file);
    for (const ref of FORBIDDEN_HEAVY_REFS) {
      assert.equal(
        content.includes(ref),
        false,
        `${slug} page must not reference '${ref}'`
      );
    }
  }
  const sliderContent = readSeo("components/seo/PdfVistaireCompareSlider.tsx");
  for (const ref of FORBIDDEN_HEAVY_REFS) {
    assert.equal(
      sliderContent.includes(ref),
      false,
      `slider must not reference '${ref}'`
    );
  }
});

test("Each pillar page keeps exactly one visible <h1> bound to its data", () => {
  for (const [slug, file] of Object.entries(SEO_PAGE_FILES)) {
    const content = readSeo(file);
    const h1Count = (content.match(/<h1\b/g) ?? []).length;
    assert.equal(
      h1Count,
      1,
      `${slug} page must contain exactly one <h1> element (found ${h1Count})`
    );
    assert.match(
      content,
      /\{page\.h1\}/,
      `${slug} page must bind its <h1> to page.h1`
    );
  }
});

test("Pillar pages keep JsonLd, FAQ, comparison and internal links wired", () => {
  for (const [slug, file] of Object.entries(SEO_PAGE_FILES)) {
    const content = readSeo(file);
    assert.match(content, /<JsonLd\b/, `${slug} must keep <JsonLd />`);
    assert.match(content, /<SeoFaq\b/, `${slug} must keep <SeoFaq />`);
    assert.match(
      content,
      /<InternalSeoLinks\b/,
      `${slug} must keep <InternalSeoLinks />`
    );
    assert.match(
      content,
      /buildSeoPillarJsonLd/,
      `${slug} must build pillar JSON-LD`
    );
  }
});

test("No public copy in pillar pages or slider uses forbidden em-dash punctuation", () => {
  const files = [
    ...Object.values(SEO_PAGE_FILES),
    "components/seo/PdfVistaireCompareSlider.tsx"
  ];
  for (const file of files) {
    const content = readSeo(file);
    assert.equal(
      content.includes("\u2014"),
      false,
      `${file} must not contain an em-dash ("\u2014")`
    );
  }
});
