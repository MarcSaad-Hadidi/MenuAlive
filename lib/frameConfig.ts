/**
 * Segments de dossiers sous `public/frames/`.
 * Les assets actuels restent sous `menualive` (chemin technique / legacy).
 * Quand une séquence `vistaire` sera publiée dans `public/frames/vistaire`,
 * basculer `ACTIVE_FRAMES_SEGMENT` vers `FUTURE_VISTAIRE_FRAMES_SEGMENT`.
 */
export const LEGACY_FRAMES_PATH_SEGMENT = "menualive" as const;

export const FUTURE_VISTAIRE_FRAMES_SEGMENT = "vistaire" as const;

const ACTIVE_FRAMES_SEGMENT: typeof LEGACY_FRAMES_PATH_SEGMENT =
  LEGACY_FRAMES_PATH_SEGMENT;

export const frameConfig = {
  frameCount: 360,
  framePath: (index: number) =>
    `/frames/${ACTIVE_FRAMES_SEGMENT}/frame_${String(index + 1).padStart(4, "0")}.webp`
};
