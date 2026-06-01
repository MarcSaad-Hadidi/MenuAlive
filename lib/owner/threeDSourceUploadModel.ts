import { createHash } from "node:crypto";

export type SourceUploadIdentity = {
  restaurantSlug: string;
  menuSlug: string;
  dishSlug: string;
  version: string;
};

export type SourceUploadStatus =
  | "source_uploaded"
  | "analyzing"
  | "analysis_failed"
  | "analysis_complete"
  | "optimized"
  | "needs_review"
  | "rejected"
  | "ready_to_finalize"
  | "ready_to_publish"
  | "published"
  | "rolled_back"
  | "delete_pending"
  | "deleted";

export type SourceUploadMetadata = SourceUploadIdentity & {
  id?: string;
  originalName: string;
  bytes: number;
  sha256: string;
  mimeType: "model/gltf-binary";
  extension: ".glb";
  status: SourceUploadStatus;
  storageProvider: "supabase-storage";
  storageBucket: string;
  storagePath: string;
  uploadedByClerkUserId: string;
  uploadedByEmail: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SourceUploadPublicRecord = Omit<
  SourceUploadMetadata,
  "storageBucket" | "storagePath"
>;

export type SourceUploadStorageStatus = {
  configured: boolean;
  code: "ready" | "storage_not_configured";
  message: "ready" | "storage not configured";
  provider: "supabase-storage";
  bucket?: string;
};

export const DEFAULT_SOURCE_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
export const HARD_SOURCE_UPLOAD_MAX_BYTES = 250 * 1024 * 1024;
export const SOURCE_UPLOAD_SIZE_WARNING_BYTES = 50 * 1024 * 1024;
export const SOURCE_UPLOAD_STATUS: SourceUploadStatus = "source_uploaded";

const IDENTITY_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9._-]{1,126}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_GLB_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "model/gltf-binary"
]);
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;

type UploadEnv = Record<string, string | undefined>;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(input: Record<string, unknown>, key: keyof SourceUploadIdentity): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
}

function isSafeIdentitySegment(value: string): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    value === value.toLowerCase() &&
    !value.includes("..") &&
    IDENTITY_SEGMENT_PATTERN.test(value)
  );
}

function normalizeBytes(bytes: ArrayBuffer | ArrayBufferView): Buffer {
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function validateGlbStructure(bytes: Buffer): string | null {
  if (bytes.byteLength < 20) return "Source file is not a complete GLB binary.";
  if (bytes.subarray(0, 4).toString("ascii") !== "glTF") {
    return "Source file is not a valid GLB binary.";
  }

  const version = bytes.readUInt32LE(4);
  if (version !== 2) return "Only GLB version 2 is accepted.";

  const declaredLength = bytes.readUInt32LE(8);
  if (declaredLength !== bytes.byteLength) {
    return "GLB declared length does not match the uploaded bytes.";
  }

  let offset = 12;
  let chunkCount = 0;
  let hasJsonChunk = false;

  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) {
      return "GLB chunk header is truncated.";
    }

    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkLength <= 0 || chunkLength % 4 !== 0) {
      return "GLB chunk length is invalid.";
    }
    if (offset + chunkLength > bytes.byteLength) {
      return "GLB chunk exceeds the uploaded byte length.";
    }
    if (chunkCount === 0 && chunkType !== GLB_JSON_CHUNK_TYPE) {
      return "GLB JSON chunk is missing.";
    }

    if (chunkType === GLB_JSON_CHUNK_TYPE) {
      const jsonText = bytes
        .subarray(offset, offset + chunkLength)
        .toString("utf8")
        .replace(/[\u0000\u0020]+$/g, "");
      try {
        const parsed = JSON.parse(jsonText);
        if (!isPlainRecord(parsed) || !isPlainRecord(parsed.asset)) {
          return "GLB JSON asset metadata is missing.";
        }
      } catch {
        return "GLB JSON chunk is invalid.";
      }
      hasJsonChunk = true;
    }

    offset += chunkLength;
    chunkCount += 1;
  }

  if (!hasJsonChunk || chunkCount === 0 || offset !== bytes.byteLength) {
    return "GLB chunk layout is invalid.";
  }

  return null;
}

export function validateSourceUploadIdentity(
  input: unknown
):
  | { ok: true; identity: SourceUploadIdentity }
  | { ok: false; error: string } {
  if (!isPlainRecord(input)) {
    return { ok: false, error: "Identity fields are required." };
  }

  const identity = {
    restaurantSlug: readString(input, "restaurantSlug"),
    menuSlug: readString(input, "menuSlug"),
    dishSlug: readString(input, "dishSlug"),
    version: readString(input, "version")
  };

  for (const [key, value] of Object.entries(identity)) {
    if (!isSafeIdentitySegment(value)) {
      return { ok: false, error: `${key} is invalid.` };
    }
  }

  return { ok: true, identity };
}

export function parseSourceUploadLimit(
  env: UploadEnv
):
  | { ok: true; maxBytes: number }
  | { ok: false; error: string } {
  const raw = env.VISTAIRE_3D_SOURCE_UPLOAD_MAX_BYTES;
  if (!raw) return { ok: true, maxBytes: DEFAULT_SOURCE_UPLOAD_MAX_BYTES };

  const parsed = Number(raw);
  if (
    !Number.isInteger(parsed) ||
    parsed <= 0 ||
    parsed > HARD_SOURCE_UPLOAD_MAX_BYTES
  ) {
    return { ok: false, error: "Upload size cap is invalid." };
  }

  return { ok: true, maxBytes: parsed };
}

export function sanitizeSourceOriginalName(value: string): string {
  const basename = value.split(/[\\/]+/).filter(Boolean).pop() ?? "source.glb";
  const cleaned = basename
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return cleaned || "source.glb";
}

export function validateSourceGlbFile(
  file: {
    name: string;
    type: string;
    size: number;
    bytes: ArrayBuffer | ArrayBufferView;
  },
  maxBytes: number
):
  | { ok: true; originalName: string; mimeType: "model/gltf-binary"; bytes: Buffer }
  | { ok: false; error: string; status: 400 | 413 } {
  const originalName = sanitizeSourceOriginalName(file.name);
  const lowerName = originalName.toLowerCase();

  if (/[\\/]/.test(file.name) || file.name.includes("..")) {
    return { ok: false, error: "Source filename must not contain paths.", status: 400 };
  }

  if (!lowerName.endsWith(".glb")) {
    return { ok: false, error: "Only .glb source files are accepted.", status: 400 };
  }

  const declaredSize = Number(file.size);
  if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
    return { ok: false, error: "Source file is empty.", status: 400 };
  }
  if (declaredSize > maxBytes) {
    return { ok: false, error: "Source file is larger than the upload cap.", status: 413 };
  }

  const bytes = normalizeBytes(file.bytes);
  if (bytes.byteLength !== declaredSize || bytes.byteLength > maxBytes) {
    return { ok: false, error: "Source file size does not match the upload body.", status: 400 };
  }

  const mimeType = (file.type || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_GLB_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "Source file MIME type is not accepted.", status: 400 };
  }

  const glbError = validateGlbStructure(bytes);
  if (glbError) {
    return { ok: false, error: glbError, status: 400 };
  }

  return { ok: true, originalName, mimeType: "model/gltf-binary", bytes };
}

export function sha256Hex(bytes: ArrayBuffer | ArrayBufferView): string {
  return createHash("sha256").update(normalizeBytes(bytes)).digest("hex");
}

export function buildPrivateSourceKey(
  identity: SourceUploadIdentity,
  sha256: string
): string {
  const validated = validateSourceUploadIdentity(identity);
  if (!validated.ok || !SHA256_PATTERN.test(sha256)) {
    throw new Error("Invalid source upload storage identity.");
  }

  return [
    "sources",
    validated.identity.restaurantSlug,
    validated.identity.menuSlug,
    validated.identity.dishSlug,
    validated.identity.version,
    `${sha256}.glb`
  ].join("/");
}

export function isExpectedPrivateSourceKey(args: {
  identity: SourceUploadIdentity;
  sha256: string;
  storagePath: string;
}): boolean {
  try {
    return (
      args.storagePath === buildPrivateSourceKey(args.identity, args.sha256) &&
      !args.storagePath.includes("..") &&
      !args.storagePath.includes("\\")
    );
  } catch {
    return false;
  }
}

export function buildSourceUploadMetadata(args: {
  identity: SourceUploadIdentity;
  originalName: string;
  bytes: number;
  sha256: string;
  mimeType: "model/gltf-binary";
  storageProvider: "supabase-storage";
  storageBucket: string;
  storagePath: string;
  ownerUserId: string;
  ownerEmail?: string | null;
}): SourceUploadMetadata {
  const validated = validateSourceUploadIdentity(args.identity);
  if (!validated.ok || !SHA256_PATTERN.test(args.sha256)) {
    throw new Error("Invalid source upload metadata.");
  }
  if (!Number.isFinite(args.bytes) || args.bytes <= 0) {
    throw new Error("Invalid source upload size.");
  }

  return {
    ...validated.identity,
    originalName: sanitizeSourceOriginalName(args.originalName),
    bytes: args.bytes,
    sha256: args.sha256,
    mimeType: args.mimeType,
    extension: ".glb",
    status: SOURCE_UPLOAD_STATUS,
    storageProvider: args.storageProvider,
    storageBucket: args.storageBucket,
    storagePath: args.storagePath,
    uploadedByClerkUserId: args.ownerUserId,
    uploadedByEmail: args.ownerEmail ?? null
  };
}

export function toPublicSourceUploadRecord(
  metadata: SourceUploadMetadata
): SourceUploadPublicRecord {
  return {
    id: metadata.id,
    restaurantSlug: metadata.restaurantSlug,
    menuSlug: metadata.menuSlug,
    dishSlug: metadata.dishSlug,
    version: metadata.version,
    originalName: metadata.originalName,
    bytes: metadata.bytes,
    sha256: metadata.sha256,
    mimeType: metadata.mimeType,
    extension: metadata.extension,
    status: metadata.status,
    storageProvider: metadata.storageProvider,
    uploadedByClerkUserId: metadata.uploadedByClerkUserId,
    uploadedByEmail: metadata.uploadedByEmail,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt
  };
}

export function resolveSourceUploadStorageStatus(env: UploadEnv): SourceUploadStorageStatus {
  const bucket = env.VISTAIRE_3D_SOURCE_BUCKET?.trim() ?? "";
  const hasSupabaseCredentials = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!hasSupabaseCredentials || !BUCKET_PATTERN.test(bucket)) {
    return {
      configured: false,
      code: "storage_not_configured",
      message: "storage not configured",
      provider: "supabase-storage"
    };
  }

  return {
    configured: true,
    code: "ready",
    message: "ready",
    provider: "supabase-storage",
    bucket
  };
}
