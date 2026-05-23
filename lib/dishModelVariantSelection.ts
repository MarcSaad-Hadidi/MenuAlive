export type DishModelViewerSourceInput = {
  arModelSrc: string;
  isAndroid: boolean;
  mobileModelSrc: string;
  originalModelSrc: string;
  prefersMobileModel: boolean;
  webModelSrc: string;
};

function cleanSource(value: string): string {
  return value.trim();
}

export function resolveDishModelViewerSrc({
  arModelSrc,
  mobileModelSrc,
  originalModelSrc,
  prefersMobileModel,
  webModelSrc
}: DishModelViewerSourceInput): string {
  const mobile = cleanSource(mobileModelSrc);
  const web = cleanSource(webModelSrc);
  const original = cleanSource(originalModelSrc);
  const arLite = cleanSource(arModelSrc);

  if (prefersMobileModel) {
    return mobile || web || arLite;
  }

  return web || original || arLite;
}
