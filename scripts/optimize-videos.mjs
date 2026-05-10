import { mkdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { basename, join } from "node:path";

const inputs = [
  "public/videos/upscaled-video.mp4",
  // Fallback au cas où l'utilisateur a d'autres vidéos
  // "public/videos/menualive-full.mp4"
];

const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });

if (ffmpegCheck.status !== 0) {
  console.log("ffmpeg is not available. Skipping optional video optimization.");
  process.exit(0);
}

await mkdir("public/videos/optimized", { recursive: true });

for (const input of inputs) {
  const base = basename(input, ".mp4");
  
  const variants = [
    {
      suffix: "-desktop-scrub",
      // Desktop: Keep resolution, but force keyframes every 12 frames for smooth scrubbing
      args: ["-vcodec", "libx264", "-crf", "24", "-preset", "medium", "-g", "12", "-keyint_min", "1", "-an", "-movflags", "faststart"]
    },
    {
      suffix: "-mobile-scrub",
      // Mobile: Scale to 720p width (maintain aspect ratio) for better performance on mobile, force keyframes
      args: ["-vcodec", "libx264", "-vf", "scale=720:-2", "-crf", "26", "-preset", "medium", "-g", "12", "-keyint_min", "1", "-an", "-movflags", "faststart"]
    },
    {
      suffix: "-low",
      // Low: Smaller size, standard keyframes, heavily compressed for soft playback
      args: ["-vcodec", "libx264", "-vf", "scale=480:-2", "-crf", "30", "-preset", "fast", "-an", "-movflags", "faststart"]
    }
  ];

  for (const variant of variants) {
    const output = join("public/videos/optimized", `${base}${variant.suffix}.mp4`);
    console.log(`Optimizing ${input} -> ${output} ...`);

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i", input,
        ...variant.args,
        output
      ]);

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg failed for ${input} (variant ${variant.suffix}) with code ${code}`));
        }
      });
    });

    console.log(`Successfully generated ${output}`);
  }
}
