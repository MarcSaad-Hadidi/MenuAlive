import {
  buildPdfComparePreviewData,
  type CompareDishPreview,
  type PdfComparePreviewData,
  type PdfMenuSection
} from "@/lib/pdfComparePreviewData";

const CINEMATIC_BLOOM_CATEGORY = "plats-signatures";
const CINEMATIC_BLOOM_DISH_SLUGS = ["homard-bisque", "canette-aux-figues"] as const;

export type CinematicMenuBloomData = PdfComparePreviewData;

export function buildCinematicMenuBloomData(): CinematicMenuBloomData {
  return buildPdfComparePreviewData({
    activeCategorySlug: CINEMATIC_BLOOM_CATEGORY,
    vistaireDishSlugs: CINEMATIC_BLOOM_DISH_SLUGS
  });
}

export type { CompareDishPreview, PdfMenuSection };
