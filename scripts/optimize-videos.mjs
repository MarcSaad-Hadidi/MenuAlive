import { mkdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { basename, join } from "node:path";

const inputs = [
  "public/videos/video-1.mp4",
  "public/videos/video-2.mp4",
  "public/videos/video-3.mp4",
  "public/videos/video-4.mp4"
];

const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });

if (ffmpegCheck.status !== 0) {
  console.log("ffmpeg is not available. Skipping optional video optimization.");
  process.exit(0);
}

await mkdir("public/videos/optimized", { recursive: true });

for (const input of inputs) {
  const output = join("public/videos/optimized", basename(input));

  await new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      input,
      "-movflags",
      "faststart",
      "-vcodec",
      "libx264",
      "-crf",
      "24",
      "-preset",
      "medium",
      "-an",
      output
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed for ${input} with code ${code}`));
      }
    });
  });

  console.log(`Optimized ${input} -> ${output}`);
}
