import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const componentPath = "components/owner/MenuQrCode.tsx";

test("owner QR component renders a real qrcode SVG and export actions", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /import\(\s*"qrcode"\s*\)/);
  assert.match(source, /toString\(menuUrl/);
  assert.match(source, /type:\s*"svg"/);
  assert.match(source, /navigator\.clipboard\.writeText\(menuUrl\)/);
  assert.match(source, /download/);
  assert.match(source, /Menu QR/);
});
