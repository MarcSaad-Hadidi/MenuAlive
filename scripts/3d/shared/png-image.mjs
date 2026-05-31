import { unzlibSync, zlibSync } from "fflate";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  const output = Buffer.alloc(4);
  output.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return output;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, typeBytes, data, crc32(Buffer.concat([typeBytes, data]))]);
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function unfilterPngScanline(filter, scanline, previous, bytesPerPixel) {
  const output = Buffer.alloc(scanline.length);
  for (let index = 0; index < scanline.length; index += 1) {
    const raw = scanline[index];
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
    const up = previous?.[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? previous?.[index - bytesPerPixel] ?? 0 : 0;
    if (filter === 0) output[index] = raw;
    else if (filter === 1) output[index] = (raw + left) & 0xff;
    else if (filter === 2) output[index] = (raw + up) & 0xff;
    else if (filter === 3) output[index] = (raw + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) output[index] = (raw + paethPredictor(left, up, upperLeft)) & 0xff;
    else throw new Error(`PNG uses unsupported filter type ${filter}`);
  }
  return output;
}

export function parsePngImage(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    throw new Error("image must be a PNG");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let sawIdat = false;
  let sawIend = false;
  const idatParts = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) throw new Error("PNG chunk exceeds file bounds");
    const data = bytes.subarray(start, end);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      sawIdat = true;
      idatParts.push(data);
    } else if (type === "IEND") {
      sawIend = true;
      break;
    }
    offset = end + 4;
  }
  if (!width || !height) throw new Error("PNG IHDR dimensions are missing");
  if (!sawIdat || !sawIend) throw new Error("PNG must include IDAT and IEND chunks");
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error("PNG must use 8-bit RGB or RGBA pixels");
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = Buffer.from(unzlibSync(Buffer.concat(idatParts)));
  const stride = width * channels;
  if (raw.length !== (stride + 1) * height) throw new Error("PNG pixel buffer has unexpected size");
  const pixels = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const row = unfilterPngScanline(raw[rowStart], raw.subarray(rowStart + 1, rowStart + 1 + stride), previous, channels);
    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      pixels[target] = row[source];
      pixels[target + 1] = row[source + 1];
      pixels[target + 2] = row[source + 2];
      pixels[target + 3] = channels === 4 ? row[source + 3] : 255;
    }
    previous = row;
  }
  return { format: "png", width, height, pixels };
}

export function encodePngImage({ width, height, pixels }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("PNG dimensions must be positive integers");
  }
  if (!Buffer.isBuffer(pixels) || pixels.length !== width * height * 4) {
    throw new Error("PNG pixels must be a width * height * 4 RGBA buffer");
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", Buffer.from(zlibSync(raw))),
    pngChunk("IEND")
  ]);
}

function luminance(pixels, index) {
  return (0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]) / 255;
}

function saturation(pixels, index) {
  const r = pixels[index] / 255;
  const g = pixels[index + 1] / 255;
  const b = pixels[index + 2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function simpleSsim(before, after) {
  if (before.width !== after.width || before.height !== after.height) return 0;
  const count = before.width * before.height;
  let meanA = 0;
  let meanB = 0;
  for (let index = 0; index < before.pixels.length; index += 4) {
    meanA += luminance(before.pixels, index);
    meanB += luminance(after.pixels, index);
  }
  meanA /= count;
  meanB /= count;
  let varianceA = 0;
  let varianceB = 0;
  let covariance = 0;
  for (let index = 0; index < before.pixels.length; index += 4) {
    const a = luminance(before.pixels, index);
    const b = luminance(after.pixels, index);
    varianceA += (a - meanA) ** 2;
    varianceB += (b - meanB) ** 2;
    covariance += (a - meanA) * (b - meanB);
  }
  varianceA /= count;
  varianceB /= count;
  covariance /= count;
  const c1 = 0.01 ** 2;
  const c2 = 0.03 ** 2;
  return ((2 * meanA * meanB + c1) * (2 * covariance + c2)) /
    ((meanA ** 2 + meanB ** 2 + c1) * (varianceA + varianceB + c2));
}

function maskCoverage(image, background = [16, 16, 14], tolerance = 12) {
  let covered = 0;
  const count = image.width * image.height;
  for (let index = 0; index < image.pixels.length; index += 4) {
    const delta =
      Math.abs(image.pixels[index] - background[0]) +
      Math.abs(image.pixels[index + 1] - background[1]) +
      Math.abs(image.pixels[index + 2] - background[2]);
    if (image.pixels[index + 3] > 0 && delta > tolerance) covered += 1;
  }
  return covered / count;
}

function edgeSharpness(image) {
  let total = 0;
  let samples = 0;
  for (let y = 1; y < image.height - 1; y += 1) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const center = (y * image.width + x) * 4;
      const right = (y * image.width + x + 1) * 4;
      const down = ((y + 1) * image.width + x) * 4;
      total += Math.abs(luminance(image.pixels, center) - luminance(image.pixels, right));
      total += Math.abs(luminance(image.pixels, center) - luminance(image.pixels, down));
      samples += 2;
    }
  }
  return samples ? total / samples : 0;
}

export function comparePngImages(before, after, { background = [16, 16, 14], tolerance = 0 } = {}) {
  if (before.width !== after.width || before.height !== after.height) {
    throw new Error("visual comparison images must share dimensions");
  }
  const pixels = Buffer.alloc(before.width * before.height * 4);
  let changed = 0;
  let absoluteDelta = 0;
  let brightnessDelta = 0;
  let saturationDelta = 0;
  const pixelCount = before.width * before.height;
  for (let index = 0; index < before.pixels.length; index += 4) {
    const dr = Math.abs(before.pixels[index] - after.pixels[index]);
    const dg = Math.abs(before.pixels[index + 1] - after.pixels[index + 1]);
    const db = Math.abs(before.pixels[index + 2] - after.pixels[index + 2]);
    const delta = dr + dg + db;
    const out = index;
    if (delta > tolerance) {
      changed += 1;
      pixels[out] = Math.min(255, delta);
      pixels[out + 1] = 32;
      pixels[out + 2] = 32;
      pixels[out + 3] = 255;
    }
    absoluteDelta += delta / (255 * 3);
    brightnessDelta += Math.abs(luminance(before.pixels, index) - luminance(after.pixels, index));
    saturationDelta += Math.abs(saturation(before.pixels, index) - saturation(after.pixels, index));
  }
  const meanDelta = absoluteDelta / pixelCount;
  const beforeCoverage = maskCoverage(before, background);
  const afterCoverage = maskCoverage(after, background);
  const beforeSharpness = edgeSharpness(before);
  const afterSharpness = edgeSharpness(after);
  const edgeSharpnessDelta = Math.abs(beforeSharpness - afterSharpness);
  return {
    diffImage: { width: before.width, height: before.height, pixels },
    metrics: {
      diffRatio: changed / pixelCount,
      perceptualScore: Math.max(0, 1 - meanDelta),
      ssim: Math.max(0, Math.min(1, simpleSsim(before, after))),
      silhouetteDiff: Math.abs(beforeCoverage - afterCoverage),
      colorDelta: meanDelta,
      brightnessDelta: brightnessDelta / pixelCount,
      saturationDelta: saturationDelta / pixelCount,
      edgeSharpnessDelta,
      textureBlurDelta: edgeSharpnessDelta,
      materialDrift: Math.max(meanDelta, saturationDelta / pixelCount),
      objectCoverageDelta: Math.abs(beforeCoverage - afterCoverage),
      lowPolyVisibilityScore: Math.min(1, changed / pixelCount),
      appetitePreservationScore: Math.max(0, 1 - meanDelta)
    }
  };
}
