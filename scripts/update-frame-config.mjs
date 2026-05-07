import { readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const framesDir = join(process.cwd(), "public", "frames", "menualive");
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

const contents = `export const frameConfig = {
  frameCount: ${extensionFiles.length},
  framePath: (index: number) =>
    \`/frames/menualive/frame_\${String(index + 1).padStart(4, "0")}.${extension}\`
};
`;

await writeFile(frameConfigPath, contents);
console.log(`Updated frameConfig.ts with ${extensionFiles.length} ${extension} frames.`);
