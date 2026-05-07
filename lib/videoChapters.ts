export type VideoChapter = {
  id: string;
  start: number;
  end: number;
  eyebrow: string;
  title: string;
  body: string;
  cta?: string;
};

export const videoChapters: VideoChapter[] = [
  {
    id: "hero",
    start: 0,
    end: 0.24,
    eyebrow: "MenuAlive",
    title: "Du QR code au menu vivant.",
    body: "Le client scanne à table. L’expérience s’ouvre instantanément, sans application.",
    cta: "Demander une démo"
  },
  {
    id: "menu",
    start: 0.24,
    end: 0.48,
    eyebrow: "Menu digital premium",
    title: "Vos plats se présentent mieux.",
    body: "Photos, détails, options et allergènes dans une interface claire, rapide et premium."
  },
  {
    id: "ar",
    start: 0.48,
    end: 0.74,
    eyebrow: "3D / AR",
    title: "Le plat apparaît devant lui.",
    body: "Le client visualise le plat avant de commander, directement sur son téléphone."
  },
  {
    id: "restaurant",
    start: 0.74,
    end: 1.01,
    eyebrow: "Pour les restaurants",
    title: "Un menu qui donne envie.",
    body: "Valorisez vos plats signatures et transformez un simple QR code en expérience mémorable.",
    cta: "Créer une démo"
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
