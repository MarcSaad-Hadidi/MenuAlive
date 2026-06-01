import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const expectedScripts = [
  "3d:analyze-source",
  "3d:repair-source",
  "3d:optimize",
  "3d:optimize-heavy",
  "3d:optimize-dish",
  "3d:optimize-menu",
  "3d:preview",
  "3d:finalize-manifest",
  "3d:record-device-qa",
  "3d:prepare-cdn-upload",
  "3d:runner",
  "3d:runner:once",
  "3d:runner:claim",
  "3d:benchmark-heavy",
  "3d:retouch-report",
  "3d:publish",
  "3d:rollback",
  "3d:clean-stale"
];

test("package exposes the production 3D command surface", () => {
  for (const scriptName of expectedScripts) {
    assert.equal(
      typeof packageJson.scripts[scriptName],
      "string",
      `${scriptName} should be defined`
    );
    const scriptPath = packageJson.scripts[scriptName].replace(/^node\s+/, "");
    assert.equal(existsSync(scriptPath), true, `${scriptPath} should exist`);
  }
});

test("Next.js config serves production restaurant GLB and USDZ paths with immutable AR headers", () => {
  const configSource = readFileSync("next.config.ts", "utf8");

  assert.match(configSource, /\/models\/restaurants\/:path\*\.usdz/);
  assert.match(configSource, /\/models\/restaurants\/:path\*\.glb/);
  assert.match(configSource, /model\/vnd\.usdz\+zip/);
  assert.match(configSource, /Content-Disposition/);
  assert.match(configSource, /model\/gltf-binary/);
});
