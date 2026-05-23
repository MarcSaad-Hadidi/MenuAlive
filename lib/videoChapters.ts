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
    body: "Vistaire transforme le scan à table en carte digitale premium : rapide, visuelle, pensée pour le mobile et sans application.",
    cta: "Voir la carte démo",
    ctaHref: "/demo",
    secondaryCta: "Voir l’aperçu restaurateur démo",
    secondaryCtaHref: "/admin"
  },
  {
    id: "menu",
    start: 0.24,
    end: 0.48,
    eyebrow: "Carte côté convive",
    title: "Une carte faite pour le mobile.",
    body: "Maison Élyse est un restaurant fictif de démonstration : elle montre comment un convive parcourt les plats, photos et détails utiles à table.",
    cta: "Voir la carte démo",
    ctaHref: "/demo",
    secondaryCta: "Voir l’aperçu restaurateur démo",
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
    secondaryCta: "Voir la carte démo",
    secondaryCtaHref: "/demo"
  },
  {
    id: "restaurant",
    start: 0.74,
    end: 1.01,
    eyebrow: "Lecture restaurateur",
    title: "Lisez ce qui retient l’attention.",
    body: "Côté restaurant, Vistaire met en évidence les plats consultés, les recherches et les vues immersives autour de votre carte.",
    cta: "Voir l’aperçu restaurateur démo",
    ctaHref: "/admin",
    secondaryCta: "Voir la carte démo",
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
