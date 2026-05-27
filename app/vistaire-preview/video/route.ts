import { createReadStream, statSync } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIDEO_PATH = path.join(
  process.cwd(),
  "Framer",
  "Vistaire2.mp4"
);
const FALLBACK_VIDEO_PATH = path.join(
  process.cwd(),
  "public",
  "videos",
  "optimized",
  "upscaled-video-desktop-scrub.mp4"
);
const CHUNK_SIZE = 1024 * 1024;

function streamFile(filePath: string, start: number, end: number) {
  return Readable.toWeb(createReadStream(filePath, { start, end })) as
    | ReadableStream<Uint8Array>
    | BodyInit;
}

export async function GET(request: Request) {
  let videoPath = VIDEO_PATH;
  try {
    await access(videoPath);
  } catch {
    videoPath = FALLBACK_VIDEO_PATH;
    try {
      await access(videoPath);
    } catch {
      return new Response("Vistaire preview video not found.", {
        status: 404
      });
    }
  }

  const { size } = statSync(videoPath);
  const range = request.headers.get("range");
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "Content-Type": "video/mp4"
  };

  if (!range) {
    return new Response(streamFile(videoPath, 0, size - 1), {
      headers: {
        ...baseHeaders,
        "Content-Length": String(size)
      }
    });
  }

  const match = /^bytes=(\d+)-(\d*)$/.exec(range);

  if (!match) {
    return new Response(null, {
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${size}`
      },
      status: 416
    });
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : start + CHUNK_SIZE - 1;
  const end = Math.min(requestedEnd, size - 1);

  if (start >= size || end < start) {
    return new Response(null, {
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${size}`
      },
      status: 416
    });
  }

  return new Response(streamFile(videoPath, start, end), {
    headers: {
      ...baseHeaders,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`
    },
    status: 206
  });
}
