import { readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

/**
 * Script de synchro : compte les frames dans le dossier source conserve.
 * Le chemin public actif reste `/frames/vistaire/*` via rewrite Next.
 */
const FRAME_SOURCE_DIR_SEGMENT = "menualive";
const PUBLIC_FRAMES_PATH_SEGMENT = "vistaire";
const framesDir = join(process.cwd(), "public", "frames", FRAME_SOURCE_DIR_SEGMENT);
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
 * Le chemin public actif utilise Vistaire; Next preserve les anciens liens
 * avec une rewrite serveur definie dans \`next.config.ts\`.
 */
export const PUBLIC_FRAMES_PATH_SEGMENT = "${PUBLIC_FRAMES_PATH_SEGMENT}" as const;

export const frameConfig = {
  frameCount: ${extensionFiles.length},
  framePath: (index: number) =>
    \`/frames/\${PUBLIC_FRAMES_PATH_SEGMENT}/frame_\${String(index + 1).padStart(4, "0")}.${extension}\`
};
`;

await writeFile(frameConfigPath, contents);
console.log(`Updated frameConfig.ts with ${extensionFiles.length} ${extension} frames.`);
