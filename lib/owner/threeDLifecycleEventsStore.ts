import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createOwner3dLifecycleAuditEvent,
  sanitizeEvidenceLinks,
  type Owner3dAuditAction,
  type Owner3dAuditEvent,
  type Owner3dEvidenceLink
} from "@/lib/owner/threeDLifecycleModel";
import type { SourceUploadIdentity } from "@/lib/owner/threeDSourceUploadModel";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const PUBLISH_EVENTS_TABLE = "owner_3d_publish_events";

type OwnerIdentity = {
  userId: string;
  emailAddresses: string[];
};

type PublishEventRow = {
  id: string;
  event_type: "finalized" | "publish_requested" | "published" | "rollback_requested" | "rolled_back" | "unpublished" | "publish_failed";
  from_status: string | null;
  to_status: string | null;
  performed_by_clerk_user_id: string;
  performed_by_email: string | null;
  reason: string | null;
  metadata: unknown;
  created_at: string;
};

type LifecycleStoreFailure = {
  ok: false;
  code: "audit_store_not_configured" | "audit_store_unavailable";
  message: string;
  status: 503;
};

type LifecycleStoreSuccess<T> = {
  ok: true;
  configured: boolean;
  value: T;
};

function getAdminClient(): { ok: true; client: SupabaseClient } | LifecycleStoreFailure {
  const admin = getSupabaseAdminClient();
  if (!admin.ok) {
    return {
      ok: false,
      code: "audit_store_not_configured",
      message: "3D/AR audit store is not configured.",
      status: 503
    };
  }
  return { ok: true, client: admin.client };
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function rowToAuditEvent(identity: SourceUploadIdentity, row: PublishEventRow): Owner3dAuditEvent {
  const metadata = metadataObject(row.metadata);
  const evidenceLinks = Array.isArray(metadata.evidenceLinks)
    ? sanitizeEvidenceLinks(metadata.evidenceLinks as Owner3dEvidenceLink[])
    : [];
  const action = row.event_type as Owner3dAuditAction;
  const actorLabel = row.performed_by_email || row.performed_by_clerk_user_id;

  return {
    ...createOwner3dLifecycleAuditEvent({
      identity,
      action,
      actorLabel,
      oldState: row.from_status,
      newState: row.to_status,
      timestamp: row.created_at,
      reason: row.reason ?? undefined,
      evidenceLinks,
      persisted: true,
      source: "publish_event"
    }),
    id: row.id,
    actor: {
      clerkUserId: row.performed_by_clerk_user_id,
      email: row.performed_by_email ?? undefined,
      label: actorLabel
    }
  };
}

export async function listOwner3dLifecycleEvents(args: {
  identity: SourceUploadIdentity;
  fallbackEvents: Owner3dAuditEvent[];
}): Promise<LifecycleStoreSuccess<Owner3dAuditEvent[]> | LifecycleStoreFailure> {
  const admin = getAdminClient();
  if (!admin.ok) {
    return {
      ok: true,
      configured: false,
      value: args.fallbackEvents
    };
  }

  const { data, error } = await admin.client
    .from(PUBLISH_EVENTS_TABLE)
    .select("id,event_type,from_status,to_status,performed_by_clerk_user_id,performed_by_email,reason,metadata,created_at")
    .eq("metadata->>restaurantSlug", args.identity.restaurantSlug)
    .eq("metadata->>menuSlug", args.identity.menuSlug)
    .eq("metadata->>dishSlug", args.identity.dishSlug)
    .eq("metadata->>version", args.identity.version)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      ok: false,
      code: "audit_store_unavailable",
      message: "3D/AR audit events are unavailable.",
      status: 503
    };
  }

  const persisted = ((data ?? []) as PublishEventRow[]).map((row) =>
    rowToAuditEvent(args.identity, row)
  );

  return {
    ok: true,
    configured: true,
    value: [...persisted, ...args.fallbackEvents].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
  };
}

export async function recordOwner3dLifecycleRequestEvent(args: {
  identity: SourceUploadIdentity;
  owner: OwnerIdentity;
  action: "publish_requested" | "rollback_requested";
  fromStatus: string;
  toStatus: string;
  reason?: string;
  command: string;
  evidenceLinks: Owner3dEvidenceLink[];
  targetVersion?: string;
}): Promise<LifecycleStoreSuccess<Owner3dAuditEvent> | LifecycleStoreFailure> {
  const admin = getAdminClient();
  if (!admin.ok) return admin;

  const metadata = {
    restaurantSlug: args.identity.restaurantSlug,
    menuSlug: args.identity.menuSlug,
    dishSlug: args.identity.dishSlug,
    version: args.identity.version,
    targetVersion: args.targetVersion ?? null,
    command: args.command,
    manualRunnerRequired: true,
    deletesPrevious: false,
    evidenceLinks: sanitizeEvidenceLinks(args.evidenceLinks)
  };

  const { data, error } = await admin.client
    .from(PUBLISH_EVENTS_TABLE)
    .insert({
      event_type: args.action,
      from_status: args.fromStatus,
      to_status: args.toStatus,
      performed_by_clerk_user_id: args.owner.userId,
      performed_by_email: args.owner.emailAddresses[0] ?? null,
      reason: args.reason ?? null,
      metadata
    })
    .select("id,event_type,from_status,to_status,performed_by_clerk_user_id,performed_by_email,reason,metadata,created_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      code: "audit_store_unavailable",
      message: "3D/AR audit event could not be recorded.",
      status: 503
    };
  }

  return {
    ok: true,
    configured: true,
    value: rowToAuditEvent(args.identity, data as PublishEventRow)
  };
}
