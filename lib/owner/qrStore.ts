import "server-only";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { getNumber, getString, type AnyRow } from "@/lib/analytics/serverRows";
import { buildQrRedirectUrl } from "@/lib/owner/menuUrls";
import { DEFAULT_OWNER_QR_STYLE, normalizeOwnerQrStyle } from "@/lib/owner/qrStyle";
import {
  createSignedQrToken,
  generateQrToken,
  hashQrToken,
  isSignedQrToken,
  tokenPreview,
  verifySignedQrToken
} from "@/lib/owner/qrTokens";
import type {
  CreateOwnerQrCodeResult,
  OwnerQrCodeRecord,
  OwnerQrCodeStatus,
  OwnerQrStyle
} from "@/lib/owner/types";

const QR_TABLE = "qr_codes";

const QR_STATUS_VALUES = new Set<OwnerQrCodeStatus>([
  "active",
  "paused",
  "archived"
]);

function normalizeStatus(value: string): OwnerQrCodeStatus {
  return QR_STATUS_VALUES.has(value as OwnerQrCodeStatus)
    ? (value as OwnerQrCodeStatus)
    : "active";
}

function parseStyle(value: unknown): OwnerQrStyle {
  if (typeof value === "string") {
    try {
      return normalizeOwnerQrStyle(JSON.parse(value));
    } catch {
      return DEFAULT_OWNER_QR_STYLE;
    }
  }
  return normalizeOwnerQrStyle(value);
}

function sanitizeTargetPath(input: string): string | null {
  const trimmed = input.trim();
  // Only allow internal absolute paths to avoid open-redirect abuse.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed.slice(0, 512);
}

function mapQrRow(row: AnyRow): OwnerQrCodeRecord {
  const id = getString(row, ["id"], "");
  const token = getString(row, ["token_preview", "tokenPreview"], "");
  return {
    id,
    restaurantId: getString(row, ["restaurant_id", "restaurantId"], ""),
    label: getString(row, ["label"], "QR menu"),
    tokenPreview: token,
    targetPath: getString(row, ["target_path", "targetPath"], "/"),
    redirectUrl: "",
    status: normalizeStatus(getString(row, ["status"], "active")),
    scanCount: getNumber(row, ["scan_count", "scanCount"], 0),
    lastScannedAt:
      getString(row, ["last_scanned_at", "lastScannedAt"], "") || null,
    style: parseStyle(row.style_json ?? row.styleJson ?? row.style),
    persisted: true,
    createdAt: getString(row, ["created_at", "createdAt"], ""),
    updatedAt: getString(row, ["updated_at", "updatedAt"], "")
  };
}

export async function createOwnerQrCode(args: {
  restaurantId: string;
  label: string;
  targetPath: string;
  style?: unknown;
}): Promise<CreateOwnerQrCodeResult> {
  const targetPath = sanitizeTargetPath(args.targetPath);
  if (!targetPath) {
    return { ok: false, error: "Chemin de destination invalide." };
  }

  const style = normalizeOwnerQrStyle(args.style);
  const label = (args.label || "QR menu").trim().slice(0, 120);
  const now = new Date().toISOString();
  const admin = getSupabaseAdminClient();

  // Persistent path: real qr_codes row, raw token returned once, only the hash stored.
  if (admin.ok) {
    const token = generateQrToken();
    const tokenHash = hashQrToken(token);
    const insertRow = {
      restaurant_id: args.restaurantId || null,
      label,
      token_hash: tokenHash,
      token_preview: tokenPreview(token),
      target_path: targetPath,
      style_json: style,
      status: "active",
      scan_count: 0
    };

    const { data, error } = await admin.client
      .from(QR_TABLE)
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      console.error("[Vistaire owner] create qr_code failed", error.message);
      return {
        ok: false,
        error:
          "Le QR n'a pas pu etre enregistre. Verifiez que la table qr_codes existe (voir docs/owner-qr-schema.md)."
      };
    }

    const record = mapQrRow((data ?? insertRow) as AnyRow);
    record.style = style;
    record.redirectUrl = buildQrRedirectUrl(token);
    return { ok: true, record, token, persisted: true };
  }

  // Dev/build fallback only: stateless signed token, nothing persisted.
  const token = createSignedQrToken({
    targetPath,
    restaurantId: args.restaurantId
  });
  const record: OwnerQrCodeRecord = {
    id: `local-${tokenPreview(token)}`,
    restaurantId: args.restaurantId,
    label,
    tokenPreview: tokenPreview(token),
    targetPath,
    redirectUrl: buildQrRedirectUrl(token),
    status: "active",
    scanCount: 0,
    lastScannedAt: null,
    style,
    persisted: false,
    createdAt: now,
    updatedAt: now
  };
  return { ok: true, record, token, persisted: false };
}

export async function updateOwnerQrCode(
  id: string,
  patch: { status?: OwnerQrCodeStatus; style?: unknown; label?: string }
): Promise<{ ok: true; record: OwnerQrCodeRecord } | { ok: false; error: string }> {
  const admin = getSupabaseAdminClient();
  if (!admin.ok) {
    return {
      ok: false,
      error:
        "Mise a jour QR non persistee : Supabase n'est pas configure (table qr_codes requise)."
    };
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status && QR_STATUS_VALUES.has(patch.status)) {
    update.status = patch.status;
  }
  if (patch.style !== undefined) {
    update.style_json = normalizeOwnerQrStyle(patch.style);
  }
  if (typeof patch.label === "string" && patch.label.trim()) {
    update.label = patch.label.trim().slice(0, 120);
  }

  const { data, error } = await admin.client
    .from(QR_TABLE)
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: "QR introuvable ou non modifiable." };
  }

  return { ok: true, record: mapQrRow(data as AnyRow) };
}

/**
 * Resolves an incoming /q token to an internal redirect target.
 * Hashes the token and matches qr_codes.token_hash; checks status === active;
 * best-effort increments scan_count. Falls back to verifying signed dev tokens.
 */
export async function resolveQrToken(
  token: string
): Promise<{ ok: true; targetPath: string } | { ok: false }> {
  if (!token || token.length > 800) return { ok: false };

  const admin = getSupabaseAdminClient();

  if (admin.ok && !isSignedQrToken(token)) {
    const tokenHash = hashQrToken(token);
    const { data, error } = await admin.client
      .from(QR_TABLE)
      .select("*")
      .eq("token_hash", tokenHash)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const row = data as AnyRow;
      const status = normalizeStatus(getString(row, ["status"], "active"));
      if (status !== "active") return { ok: false };

      const targetPath = sanitizeTargetPath(
        getString(row, ["target_path", "targetPath"], "")
      );
      if (!targetPath) return { ok: false };

      const id = getString(row, ["id"], "");
      if (id) {
        void admin.client
          .from(QR_TABLE)
          .update({
            scan_count: getNumber(row, ["scan_count", "scanCount"], 0) + 1,
            last_scanned_at: new Date().toISOString()
          })
          .eq("id", id)
          .then(undefined, () => undefined);
      }

      return { ok: true, targetPath };
    }
  }

  // Signed fallback token (dev/build, or when DB lookup missed).
  const signed = verifySignedQrToken(token);
  if (signed) {
    const targetPath = sanitizeTargetPath(signed.targetPath);
    if (targetPath) return { ok: true, targetPath };
  }

  return { ok: false };
}
