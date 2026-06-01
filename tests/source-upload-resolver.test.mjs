import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildPrivateSourceStoragePath,
  safeLocalSourcePath,
  resolveSourceUploadToLocalSource
} from "../scripts/3d/shared/source-upload-resolver.mjs";

function padJson(json) {
  const raw = Buffer.from(JSON.stringify(json), "utf8");
  const padding = (4 - (raw.length % 4)) % 4;
  return Buffer.concat([raw, Buffer.alloc(padding, 0x20)]);
}

function createValidGlb() {
  const json = padJson({ asset: { version: "2.0", generator: "resolver-test" }, scenes: [] });
  const totalLength = 12 + 8 + json.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32LE(json.length, 0);
  chunkHeader.writeUInt32LE(0x4e4f534a, 4);
  return Buffer.concat([header, chunkHeader, json]);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const identity = {
  restaurantSlug: "maison-elyse",
  menuSlug: "main",
  dishSlug: "homard-bisque",
  version: "v1"
};

function sourceRow(overrides = {}) {
  const bytes = overrides.bytes ?? createValidGlb();
  const digest = overrides.sha256 ?? sha256(bytes);
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    restaurant_slug: overrides.restaurantSlug ?? identity.restaurantSlug,
    menu_slug: overrides.menuSlug ?? identity.menuSlug,
    dish_slug: overrides.dishSlug ?? identity.dishSlug,
    version: overrides.version ?? identity.version,
    original_name: "source.glb",
    bytes: overrides.rowBytes ?? bytes.length,
    sha256: digest,
    mime_type: "model/gltf-binary",
    extension: ".glb",
    status: overrides.status ?? "source_uploaded",
    storage_provider: overrides.storageProvider ?? "supabase-storage",
    storage_bucket: overrides.storageBucket ?? "vistaire-3d-sources",
    storage_path:
      overrides.storagePath ??
      buildPrivateSourceStoragePath({
        identity: {
          restaurantSlug: overrides.restaurantSlug ?? identity.restaurantSlug,
          menuSlug: overrides.menuSlug ?? identity.menuSlug,
          dishSlug: overrides.dishSlug ?? identity.dishSlug,
          version: overrides.version ?? identity.version
        },
        sha256: digest
      }),
    created_at: overrides.createdAt ?? "2026-01-01T00:00:00.000Z"
  };
}

function createMockClient({
  rows = [],
  downloads = new Map(),
  downloadErrors = new Map(),
  buckets = new Map([["vistaire-3d-sources", { id: "vistaire-3d-sources", public: false }]])
}) {
  return {
    from(tableName) {
      assert.equal(tableName, "owner_3d_ar_source_uploads");
      const filters = [];
      return {
        select() {
          return this;
        },
        eq(column, value) {
          filters.push((row) => row[column] === value);
          return this;
        },
        in(column, values) {
          filters.push((row) => values.includes(row[column]));
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          const data = rows.find((row) => filters.every((filter) => filter(row))) ?? null;
          return { data, error: null };
        }
      };
    },
    storage: {
      async getBucket(bucket) {
        const data = buckets.get(bucket);
        if (!data) return { data: null, error: { message: "bucket not found" } };
        return { data, error: null };
      },
      from(bucket) {
        return {
          async download(path) {
            const key = `${bucket}/${path}`;
            const error = downloadErrors.get(key);
            if (error) return { data: null, error: { message: error } };
            const bytes = downloads.get(key);
            if (!bytes) return { data: null, error: { message: "object not found" } };
            return { data: new Blob([bytes]), error: null };
          }
        };
      }
    }
  };
}

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-source-resolver-"));
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => rmSync(dir, { recursive: true, force: true }));
}

function tryCreateSymlink(target, path, type = undefined) {
  try {
    symlinkSync(target, path, type);
    return true;
  } catch (error) {
    if (error?.code === "EPERM") return false;
    throw error;
  }
}

test("source upload resolver downloads a valid private GLB into ignored local source path", async () => {
  await withTempDir(async (rootDir) => {
    const bytes = createValidGlb();
    const row = sourceRow({ bytes });
    const client = createMockClient({
      rows: [row],
      downloads: new Map([[`${row.storage_bucket}/${row.storage_path}`, bytes]])
    });

    const result = await resolveSourceUploadToLocalSource(client, {
      rootDir,
      identity,
      env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" },
      allowedRestaurantSlugs: ["maison-elyse"]
    });

    assert.match(
      result.relativeSourcePath,
      /^assets\/3d\/source\/maison-elyse\/main\/homard-bisque\/v1\/source\.glb$/
    );
    assert.equal(readFileSync(result.sourcePath).equals(bytes), true);
    assert.equal(readFileSync(`${result.sourcePath}.sha256`, "utf8"), `${sha256(bytes)}\n`);
    assert.equal(result.artifact.type, "source");
    assert.equal(result.artifact.sha256, sha256(bytes));
    assert.equal(result.artifact.bytes, bytes.length);
    assert.equal(existsSync(join(rootDir, "public", "models")), false);
  });
});

test("source upload resolver refuses downloaded SHA mismatch without writing public assets", async () => {
  await withTempDir(async (rootDir) => {
    const expected = createValidGlb();
    const actual = Buffer.from(expected);
    actual[actual.length - 1] = actual[actual.length - 1] === 0x20 ? 0x21 : 0x20;
    const row = sourceRow({ bytes: expected });
    const client = createMockClient({
      rows: [row],
      downloads: new Map([[`${row.storage_bucket}/${row.storage_path}`, actual]])
    });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /SHA-256/
    );
    assert.equal(existsSync(join(rootDir, "assets", "3d", "source")), false);
    assert.equal(existsSync(join(rootDir, "public", "models")), false);
  });
});

test("source upload resolver refuses path traversal metadata", async () => {
  await withTempDir(async (rootDir) => {
    const bytes = createValidGlb();
    const row = sourceRow({
      bytes,
      storagePath: "sources/maison-elyse/main/homard-bisque/v1/../../secret.glb"
    });
    const client = createMockClient({
      rows: [row],
      downloads: new Map([[`${row.storage_bucket}/${row.storage_path}`, bytes]])
    });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /storage path/i
    );
  });
});

test("source upload resolver refuses missing private storage object", async () => {
  await withTempDir(async (rootDir) => {
    const row = sourceRow();
    const client = createMockClient({
      rows: [row],
      downloadErrors: new Map([[`${row.storage_bucket}/${row.storage_path}`, "not found"]])
    });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /download failed/i
    );
  });
});

test("source upload resolver refuses public source buckets before download", async () => {
  await withTempDir(async (rootDir) => {
    const bytes = createValidGlb();
    const row = sourceRow({ bytes });
    const client = createMockClient({
      rows: [row],
      buckets: new Map([["vistaire-3d-sources", { id: "vistaire-3d-sources", public: true }]]),
      downloads: new Map([[`${row.storage_bucket}/${row.storage_path}`, bytes]])
    });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /private/i
    );
    assert.equal(existsSync(join(rootDir, "assets", "3d", "source")), false);
  });
});

test("source upload resolver refuses a latest non-runnable upload instead of falling back", async () => {
  await withTempDir(async (rootDir) => {
    const older = sourceRow({ id: "11111111-1111-4111-8111-111111111111" });
    const newer = sourceRow({
      id: "22222222-2222-4222-8222-222222222222",
      status: "deleted",
      createdAt: "2026-01-02T00:00:00.000Z"
    });
    const client = createMockClient({
      rows: [newer, older],
      downloads: new Map([[`${older.storage_bucket}/${older.storage_path}`, createValidGlb()]])
    });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /status/i
    );
  });
});

test("source upload resolver refuses wrong restaurant access", async () => {
  await withTempDir(async (rootDir) => {
    const row = sourceRow();
    const client = createMockClient({ rows: [row] });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" },
          allowedRestaurantSlugs: ["bistro-rouge"]
        }),
      /not allowed/i
    );
  });
});

test("source upload resolver refuses Git LFS pointers and malformed GLB bytes", async () => {
  await withTempDir(async (rootDir) => {
    const bytes = Buffer.from(
      "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 123\n",
      "utf8"
    );
    const row = sourceRow({ bytes });
    const client = createMockClient({
      rows: [row],
      downloads: new Map([[`${row.storage_bucket}/${row.storage_path}`, bytes]])
    });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /Git LFS pointer/
    );
  });
});

test("source upload resolver refuses to write sha sidecar over a symlink", async () => {
  await withTempDir(async (rootDir) => {
    const bytes = createValidGlb();
    const row = sourceRow({ bytes });
    const client = createMockClient({
      rows: [row],
      downloads: new Map([[`${row.storage_bucket}/${row.storage_path}`, bytes]])
    });
    const sourceDir = join(
      rootDir,
      "assets",
      "3d",
      "source",
      identity.restaurantSlug,
      identity.menuSlug,
      identity.dishSlug,
      identity.version
    );
    mkdirSync(sourceDir, { recursive: true });
    const victim = join(rootDir, "victim.txt");
    writeFileSync(victim, "unchanged");
    const linked = tryCreateSymlink(victim, join(sourceDir, "source.glb.sha256"));
    if (!linked) return;

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /symlink/i
    );
    assert.equal(readFileSync(victim, "utf8"), "unchanged");
  });
});

test("source upload resolver refuses source paths below junction/symlink ancestors", async () => {
  await withTempDir(async (rootDir) => {
    const outside = join(rootDir, "outside-source");
    mkdirSync(outside);
    const sourceRoot = join(rootDir, "assets", "3d", "source");
    mkdirSync(join(rootDir, "assets", "3d"), { recursive: true });
    const linked = tryCreateSymlink(outside, sourceRoot, "junction");
    if (!linked) return;

    const bytes = createValidGlb();
    const row = sourceRow({ bytes });
    const client = createMockClient({
      rows: [row],
      downloads: new Map([[`${row.storage_bucket}/${row.storage_path}`, bytes]])
    });

    await assert.rejects(
      () =>
        resolveSourceUploadToLocalSource(client, {
          rootDir,
          identity,
          env: { VISTAIRE_3D_SOURCE_BUCKET: "vistaire-3d-sources" }
        }),
      /symlink/i
    );
    assert.equal(existsSync(safeLocalSourcePath({ rootDir, identity })), false);
  });
});
