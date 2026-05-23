import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { zipSync } from "fflate";

import { validateBudgets } from "../scripts/3d/shared/validators/budget-checks.mjs";
import { validateGlbBasic } from "../scripts/3d/shared/validators/glb-basic.mjs";
import { validateDishManifestSchema } from "../scripts/3d/shared/validators/manifest-schema.mjs";
import { validateNetworkHeaders } from "../scripts/3d/shared/validators/network-headers.mjs";
import { validateUsdzBasic } from "../scripts/3d/shared/validators/usdz-basic.mjs";

function padJson(value) {
  const raw = Buffer.from(JSON.stringify(value), "utf8");
  const padding = (4 - (raw.length % 4)) % 4;
  return Buffer.concat([raw, Buffer.alloc(padding, 0x20)]);
}

function makeGlb(gltf) {
  const json = padJson(gltf);
  const totalLength = 12 + 8 + json.length;
  const buffer = Buffer.alloc(totalLength);
  buffer.write("glTF", 0, "utf8");
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  buffer.writeUInt32LE(json.length, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  json.copy(buffer, 20);
  return buffer;
}

function validGltf(overrides = {}) {
  return {
    asset: { version: "2.0", generator: "vistaire-test" },
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ name: "material" }],
    textures: [{ source: 0 }],
    images: [{ uri: "data:image/png;base64,AA==", mimeType: "image/png" }],
    ...overrides
  };
}

function makeUsdz(entries = {}) {
  return Buffer.from(
    zipSync({
      "model.usda": Buffer.from(
        [
          "#usda 1.0",
          "def Mesh \"Dish\" {",
          "  point3f[] points = [(0, 0, 0), (1, 0, 0), (0, 1, 0)]",
          "  int[] faceVertexIndices = [0, 1, 2]",
          "}",
          "def Material \"Mat\" {}"
        ].join("\n")
      ),
      ...entries
    })
  );
}

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-3d-validators-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const manifestBase = {
  restaurantSlug: "maison-elyse",
  menuSlug: "demo",
  dishSlug: "homard-bisque",
  activeVersion: "v1",
  status: "review",
  variants: {
    web: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/web/homard.glb",
      bytes: 4_000_000,
      sha256: "a".repeat(64)
    },
    mobile: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/mobile/homard.glb",
      bytes: 2_000_000,
      sha256: "b".repeat(64)
    },
    arLite: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/ar-lite/homard.glb",
      bytes: 3_000_000,
      sha256: "c".repeat(64)
    },
    iosUsdz: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/ios/homard.usdz",
      bytes: 4_800_000,
      sha256: "d".repeat(64)
    },
    poster: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/poster/homard.webp",
      bytes: 120_000,
      sha256: "e".repeat(64)
    }
  },
  budgets: {},
  physicalDimensions: {
    unit: "meters",
    width: 0.21,
    height: 0.09,
    depth: 0.18
  },
  validation: { warnings: [], fails: [] },
  generatedAt: "2026-05-22T00:00:00.000Z",
  approvedAt: null,
  publishedAt: null
};

test("basic GLB validator reads JSON chunk metrics and warns about AR-incompatible required extensions", () =>
  withTempDir((dir) => {
    const glbPath = join(dir, "dish.glb");
    writeFileSync(
      glbPath,
      makeGlb(
        validGltf({
          extensionsRequired: ["EXT_meshopt_compression"],
          extensionsUsed: ["EXT_meshopt_compression"]
        })
      )
    );

    const result = validateGlbBasic({ filePath: glbPath, role: "arLite" });

    assert.equal(result.ok, true);
    assert.equal(result.metrics.meshCount, 1);
    assert.equal(result.metrics.primitiveCount, 1);
    assert.equal(result.metrics.materialCount, 1);
    assert.equal(result.metrics.textureCount, 1);
    assert.match(result.warnings.join("\n"), /EXT_meshopt_compression/);
  }));

test("basic USDZ validator accepts readable geometry packages and warns for missing textures", () =>
  withTempDir((dir) => {
    const usdzPath = join(dir, "dish.usdz");
    writeFileSync(usdzPath, makeUsdz());

    const result = validateUsdzBasic({ filePath: usdzPath, url: "/models/restaurants/r/m/d/v/ios/dish.usdz" });

    assert.equal(result.ok, true);
    assert.equal(result.metrics.usdLayerCount, 1);
    assert.equal(result.metrics.geometryLayerCount, 1);
    assert.equal(result.metrics.textureCount, 0);
    assert.match(result.warnings.join("\n"), /texture/i);
  }));

test("manifest schema rejects zero bytes and embedded validation failures", () => {
  const result = validateDishManifestSchema(
    {
      ...manifestBase,
      variants: {
        ...manifestBase.variants,
        web: { ...manifestBase.variants.web, bytes: 0 }
      },
      validation: { warnings: [], fails: ["visual review failed"] }
    },
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /bytes.*positive/i);
  assert.match(result.fails.join("\n"), /validation\.fails/i);
});

test("budget validator warns above target, fails above fail, and deduplicates public total URLs", () => {
  const sharedUrl = "/models/restaurants/maison-elyse/demo/homard-bisque/v1/shared/homard.glb";
  const result = validateBudgets({
    manifest: {
      ...manifestBase,
      variants: {
        ...manifestBase.variants,
        web: { ...manifestBase.variants.web, url: sharedUrl, bytes: 4_000_000 },
        mobile: { ...manifestBase.variants.mobile, url: sharedUrl, bytes: 4_000_000 },
        arLite: { ...manifestBase.variants.arLite, url: sharedUrl, bytes: 4_000_000 },
        iosUsdz: { ...manifestBase.variants.iosUsdz, bytes: 5_300_000 }
      }
    },
    profile: "simpleDish"
  });

  assert.equal(result.ok, false);
  assert.match(result.warnings.join("\n"), /iosUsdz.*target/i);
  assert.match(result.fails.join("\n"), /iosUsdz.*fail/i);
  assert.equal(result.metrics.publicTotalBytes, 9_420_000);
});

test("network header validator uses Content-Range total when HEAD falls back to GET Range", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method, range: options.headers?.Range });
    if (options.method === "HEAD") {
      return new Response(null, { status: 405 });
    }
    return new Response("", {
      status: 206,
      headers: {
        "content-type": "model/vnd.usdz+zip",
        "content-disposition": "inline",
        "cache-control": "public, max-age=31536000, immutable",
        "content-length": "1",
        "content-range": "bytes 0-0/5239742"
      }
    });
  };

  const result = await validateNetworkHeaders({
    baseUrl: "http://localhost:3000",
    assets: [
      {
        url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/ios/homard.usdz",
        label: "homard ios USDZ",
        role: "iosUsdz",
        productionQuickLook: true
      }
    ],
    fetchImpl
  });

  assert.equal(result.ok, true);
  assert.equal(result.metrics.assets[0].contentLength, 5_239_742);
  assert.deepEqual(
    calls.map((call) => [call.method, call.range ?? ""]),
    [
      ["HEAD", ""],
      ["GET", "bytes=0-0"]
    ]
  );
});

test("next config explicitly covers restaurant manifest JSON headers", () => {
  const source = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

  assert.match(source, /source:\s*"\/models\/restaurants\/:path\*\.json"/);
  assert.match(source, /Content-Type",\s*value:\s*"application\/json"/);
  assert.match(source, /max-age=300/);
});
