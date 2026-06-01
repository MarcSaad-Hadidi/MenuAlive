import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const uploadModel = await import("../lib/owner/threeDSourceUploadModel.ts");

const VALID_IDENTITY = {
  restaurantSlug: "maison-elyse",
  menuSlug: "main",
  dishSlug: "homard-bisque",
  version: "v1"
};

function makeValidGlb(overrides = {}) {
  const json = Buffer.from(JSON.stringify({ asset: { version: "2.0" } }), "utf8");
  const padding = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20);
  const jsonChunk = Buffer.concat([json, padding]);
  const length = 12 + 8 + jsonChunk.length;
  const bytes = Buffer.alloc(length);
  bytes.write("glTF", 0, "ascii");
  bytes.writeUInt32LE(overrides.version ?? 2, 4);
  bytes.writeUInt32LE(overrides.declaredLength ?? length, 8);
  bytes.writeUInt32LE(overrides.chunkLength ?? jsonChunk.length, 12);
  bytes.writeUInt32LE(overrides.chunkType ?? 0x4e4f534a, 16);
  jsonChunk.copy(bytes, 20);
  return overrides.truncate ? bytes.subarray(0, bytes.length - 2) : bytes;
}

test("owner 3D source upload identity rejects traversal and loose slugs", () => {
  assert.deepEqual(
    uploadModel.validateSourceUploadIdentity(VALID_IDENTITY),
    { ok: true, identity: VALID_IDENTITY }
  );

  for (const value of ["../secret", "maison/elyse", "maison\\elyse", " Maison ", ""]) {
    assert.equal(
      uploadModel.validateSourceUploadIdentity({
        ...VALID_IDENTITY,
        restaurantSlug: value
      }).ok,
      false,
      value
    );
  }

  assert.equal(
    uploadModel.validateSourceUploadIdentity({
      ...VALID_IDENTITY,
      version: "v1/../../public"
    }).ok,
    false
  );
});

test("owner 3D source upload validates GLB extension, MIME, magic bytes, and size cap", () => {
  const cap = uploadModel.parseSourceUploadLimit({
    VISTAIRE_3D_SOURCE_UPLOAD_MAX_BYTES: "1024"
  });

  assert.equal(cap.ok, true);
  assert.equal(cap.maxBytes, 1024);

  const glbBytes = makeValidGlb();

  assert.equal(
    uploadModel.validateSourceGlbFile(
      {
        name: "source.glb",
        type: "model/gltf-binary",
        size: glbBytes.length,
        bytes: glbBytes
      },
      cap.maxBytes
    ).ok,
    true
  );

  assert.equal(
    uploadModel.validateSourceGlbFile(
      {
        name: "../source.glb",
        type: "model/gltf-binary",
        size: glbBytes.length,
        bytes: glbBytes
      },
      cap.maxBytes
    ).ok,
    false
  );

  assert.equal(
    uploadModel.validateSourceGlbFile(
      {
        name: "source.txt",
        type: "text/plain",
        size: glbBytes.length,
        bytes: glbBytes
      },
      cap.maxBytes
    ).ok,
    false
  );

  assert.equal(
    uploadModel.validateSourceGlbFile(
      {
        name: "source.glb",
        type: "model/gltf-binary",
        size: 2048,
        bytes: glbBytes
      },
      cap.maxBytes
    ).ok,
    false
  );

  assert.equal(
    uploadModel.validateSourceGlbFile(
      {
        name: "source.glb",
        type: "application/octet-stream",
        size: 12,
        bytes: Buffer.from("not-a-glb-file")
      },
      cap.maxBytes
    ).ok,
    false
  );

  for (const invalidBytes of [
    Buffer.from("glTF-not-a-real-glb"),
    makeValidGlb({ version: 1 }),
    makeValidGlb({ declaredLength: 999 }),
    makeValidGlb({ truncate: true }),
    makeValidGlb({ chunkType: 0x004e4942 })
  ]) {
    assert.equal(
      uploadModel.validateSourceGlbFile(
        {
          name: "source.glb",
          type: "model/gltf-binary",
          size: invalidBytes.length,
          bytes: invalidBytes
        },
        cap.maxBytes
      ).ok,
      false
    );
  }
});

test("owner 3D source upload builds private staging metadata without caller paths", () => {
  const metadata = uploadModel.buildSourceUploadMetadata({
    identity: VALID_IDENTITY,
    originalName: "../chef/source.glb",
    bytes: 12,
    sha256: "a".repeat(64),
    mimeType: "model/gltf-binary",
    storageProvider: "supabase-storage",
    storageBucket: "vistaire-3d-sources",
    storagePath: uploadModel.buildPrivateSourceKey(VALID_IDENTITY, "a".repeat(64)),
    ownerUserId: "user_owner",
    ownerEmail: "owner@vistaire.ca"
  });

  assert.equal(metadata.status, "source_uploaded");
  assert.equal(metadata.originalName, "source.glb");
  assert.equal(metadata.sha256, "a".repeat(64));
  assert.match(metadata.storagePath, /^sources\/maison-elyse\/main\/homard-bisque\/v1\/a{64}\.glb$/);
  assert.doesNotMatch(metadata.storagePath, /\.\.|\\|public\/models|assets\/3d\/source/);
  assert.equal(
    uploadModel.isExpectedPrivateSourceKey({
      identity: VALID_IDENTITY,
      sha256: "a".repeat(64),
      storagePath: metadata.storagePath
    }),
    true
  );
  assert.equal(
    uploadModel.isExpectedPrivateSourceKey({
      identity: VALID_IDENTITY,
      sha256: "a".repeat(64),
      storagePath: "sources/maison-elyse/main/homard-bisque/v1/other.glb"
    }),
    false
  );
});

test("owner 3D source upload reports storage missing without exposing env names", () => {
  const status = uploadModel.resolveSourceUploadStorageStatus({});

  assert.equal(status.configured, false);
  assert.equal(status.code, "storage_not_configured");
  assert.equal(status.message, "storage not configured");
  assert.doesNotMatch(JSON.stringify(status), /SUPABASE|SERVICE_ROLE|NEXT_PUBLIC|VISTAIRE_3D_SOURCE_BUCKET/);
});

test("owner 3D source upload API routes are auth-gated and never write public binaries", () => {
  const routes = [
    join(process.cwd(), "app", "api", "owner", "3d-ar", "sources", "route.ts"),
    join(process.cwd(), "app", "api", "owner", "3d-ar", "sources", "status", "route.ts"),
    join(process.cwd(), "app", "api", "owner", "3d-ar", "sources", "staging", "route.ts")
  ];

  for (const route of routes) {
    assert.equal(existsSync(route), true, route);
    const source = readFileSync(route, "utf8");
    assert.match(source, /requireVistaireOwnerApi\(\)/);
    assert.doesNotMatch(source, /public\/models|assets\/3d\/source|SUPABASE_SERVICE_ROLE_KEY|admin\.reason/);
  }

  const deleteRoute = readFileSync(routes[2], "utf8");
  const uploadRoute = readFileSync(routes[0], "utf8");
  assert.match(uploadRoute, /requireSameOriginOwnerMutation/);
  assert.match(deleteRoute, /requireSameOriginOwnerMutation/);
  assert.match(deleteRoute, /confirmed/);
  assert.match(deleteRoute, /DELETE STAGING SOURCE/);
  assert.match(deleteRoute, /restaurantSlug/);
  assert.match(deleteRoute, /menuSlug/);
  assert.match(deleteRoute, /dishSlug/);
  assert.match(deleteRoute, /version/);

  const serverStore = readFileSync(
    join(process.cwd(), "lib", "owner", "threeDSourceUploads.ts"),
    "utf8"
  );
  assert.match(serverStore, /isExpectedPrivateSourceKey/);
  assert.match(serverStore, /delete_pending/);
  assert.match(serverStore, /eq\("restaurant_slug"/);
  assert.match(serverStore, /eq\("status", "delete_pending"\)/);
  assert.match(serverStore, /select\("id"\)/);
  assert.match(serverStore, /!pendingRow/);
  assert.match(serverStore, /!deletedRow/);

  const migration = readFileSync(
    join(process.cwd(), "supabase", "migrations", "0003_owner_3d_ar_source_uploads.sql"),
    "utf8"
  );
  assert.match(migration, /storage_path_matches_metadata/);
  assert.match(migration, /delete_pending/);
});

test("owner 3D source upload route requires content length before multipart parsing", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "api", "owner", "3d-ar", "sources", "route.ts"),
    "utf8"
  );

  assert.match(source, /content-length/);
  assert.match(source, /status: 411/);
  assert.ok(source.indexOf("content-length") < source.indexOf("request.formData()"));
  assert.equal(uploadModel.DEFAULT_SOURCE_UPLOAD_MAX_BYTES, 25 * 1024 * 1024);
});

test("owner 3D source upload UI exposes configured failure state without model preload", () => {
  const componentPath = join(
    process.cwd(),
    "components",
    "owner",
    "Owner3dSourceUploadPanel.tsx"
  );
  assert.equal(existsSync(componentPath), true);
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /storage not configured/);
  assert.match(source, /accept="\.glb,model\/gltf-binary"/);
  assert.doesNotMatch(source, /model-viewer|prefetchUsdzForQuickLook|prepareDishAssetIntent/);
});
