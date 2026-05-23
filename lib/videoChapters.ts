export type VideoChapter = {
  id: string;
  start: number;
  end: number;
  eyebrow: string;
  title: string;
  body: string;
  cta?: string;
  /** Lien du bouton principal (défaut : expérience Vistaire). */
  ctaHref?: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
};

export const videoChapters: VideoChapter[] = [
  {
    id: "hero",
    start: 0,
    end: 0.24,
    eyebrow: "QR code à table",
    title: "Le QR code devient une vraie carte.",
    body: "Vistaire transforme le scan à table en menu digital premium : rapide, visuel, mobile-first et sans application.",
    cta: "Voir le menu client",
    ctaHref: "/demo",
    secondaryCta: "Voir l’aperçu restaurateur",
    secondaryCtaHref: "/admin"
  },
  {
    id: "menu",
    start: 0.24,
    end: 0.48,
    eyebrow: "Menu client",
    title: "Une carte faite pour le mobile.",
    body: "Maison Élyse est une démonstration : elle montre comment un convive parcourt les plats, photos et détails utiles à table.",
    cta: "Voir le menu client",
    ctaHref: "/demo",
    secondaryCta: "Voir l’aperçu restaurateur",
    secondaryCtaHref: "/admin"
  },
  {
    id: "ar",
    start: 0.48,
    end: 0.74,
    eyebrow: "3D / AR sélective",
    title: "L’immersion sert les signatures.",
    body: "Certains plats peuvent être explorés en 3D ou placés devant le convive quand l’appareil le permet.",
    cta: "Explorer une fiche 3D",
    ctaHref: "/demo/dishes/homard-bisque",
    secondaryCta: "Voir le menu client",
    secondaryCtaHref: "/demo"
  },
  {
    id: "restaurant",
    start: 0.74,
    end: 1.01,
    eyebrow: "Lecture restaurateur",
    title: "Lisez ce qui retient l’attention.",
    body: "Côté restaurant, Vistaire révèle les plats consultés, les recherches et les vues immersives autour de votre carte.",
    cta: "Voir l’aperçu restaurateur",
    ctaHref: "/admin",
    secondaryCta: "Voir le menu client",
    secondaryCtaHref: "/demo"
  }
];

export function getActiveChapter(progress: number) {
  const clampedProgress = Number.isFinite(progress)
    ? Math.min(Math.max(progress, 0), 1)
    : 0;

  return (
    videoChapters.find(
      (chapter) =>
        clampedProgress >= chapter.start && clampedProgress < chapter.end
    ) ?? videoChapters[videoChapters.length - 1]
  );
}
