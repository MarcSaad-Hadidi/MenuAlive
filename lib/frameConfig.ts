/**
 * Segments de dossiers sous `public/frames/`.
 * Le chemin public actif utilise Vistaire; Next preserve les anciens liens
 * avec une rewrite serveur definie dans `next.config.ts`.
 */
export const PUBLIC_FRAMES_PATH_SEGMENT = "vistaire" as const;

export const frameConfig = {
  frameCount: 360,
  framePath: (index: number) =>
    `/frames/${PUBLIC_FRAMES_PATH_SEGMENT}/frame_${String(index + 1).padStart(4, "0")}.webp`
};
