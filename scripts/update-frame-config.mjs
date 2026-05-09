import { readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

/**
 * Script de synchro : compte les frames dans `public/frames/menualive` (source réelle actuelle).
 * Futur : dupliquer la logique ou ajouter un flag pour `public/frames/vistaire` sans casser le déploiement.
 */
const LEGACY_FRAMES_DIR_SEGMENT = "menualive";
const framesDir = join(process.cwd(), "public", "frames", LEGACY_FRAMES_DIR_SEGMENT);
const frameConfigPath = join(process.cwd(), "lib", "frameConfig.ts");
const frameNamePattern = /^frame_(\d{4})\.(webp|jpe?g)$/i;

const files = (await readdir(framesDir))
  .filter((file) => frameNamePattern.test(file))
  .sort();

if (files.length === 0) {
  throw new Error(`No frames found in ${framesDir}`);
}

const extension = extname(files[0]).slice(1).toLowerCase();
const extensionFiles = files.filter(
  (file) => extname(file).slice(1).toLowerCase() === extension
);

if (extensionFiles.length !== files.length) {
  throw new Error("Mixed frame extensions found. Keep one image format per sequence.");
}

const fileSet = new Set(extensionFiles);
const missingFrames = [];

for (let index = 1; index <= extensionFiles.length; index += 1) {
  const expectedName = `frame_${String(index).padStart(4, "0")}.${extension}`;

  if (!fileSet.has(expectedName)) {
    missingFrames.push(expectedName);
  }
}

if (missingFrames.length > 0) {
  throw new Error(`Missing frames: ${missingFrames.slice(0, 8).join(", ")}`);
}

const contents = `/**
 * Segments de dossiers sous \`public/frames/\`.
 * Les assets actuels restent sous \`menualive\` (chemin technique / legacy).
 * Quand une séquence \`vistaire\` sera publiée dans \`public/frames/vistaire\`,
 * basculer \`ACTIVE_FRAMES_SEGMENT\` vers \`FUTURE_VISTAIRE_FRAMES_SEGMENT\`.
 */
export const LEGACY_FRAMES_PATH_SEGMENT = "menualive" as const;

export const FUTURE_VISTAIRE_FRAMES_SEGMENT = "vistaire" as const;

const ACTIVE_FRAMES_SEGMENT: typeof LEGACY_FRAMES_PATH_SEGMENT =
  LEGACY_FRAMES_PATH_SEGMENT;

export const frameConfig = {
  frameCount: ${extensionFiles.length},
  framePath: (index: number) =>
    \`/frames/\${ACTIVE_FRAMES_SEGMENT}/frame_\${String(index + 1).padStart(4, "0")}.${extension}\`
};
`;

await writeFile(frameConfigPath, contents);
console.log(`Updated frameConfig.ts with ${extensionFiles.length} ${extension} frames.`);
