export type OwnerIdentity = {
  userId?: string | null;
  emailAddresses?: string[];
};

export type OwnerPolicyEnv = {
  VISTAIRE_OWNER_EMAILS?: string;
  VISTAIRE_OWNER_USER_IDS?: string;
  VISTAIRE_OWNER_CLERK_USER_IDS?: string;
  [key: string]: string | undefined;
};

function normalizeAllowlistEntry(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
}

export function parseOwnerAllowlist(value?: string): string[] {
  if (!value) return [];

  const seen = new Set<string>();
  const entries: string[] = [];

  for (const raw of value.split(/[\s,;]+/)) {
    const entry = normalizeAllowlistEntry(raw);
    if (!entry) continue;

    const dedupeKey = entry.includes("@") ? entry.toLowerCase() : entry;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    entries.push(entry);
  }

  return entries;
}

export function getOwnerUserIdAllowlist(env: OwnerPolicyEnv): string[] {
  return [
    ...parseOwnerAllowlist(env.VISTAIRE_OWNER_USER_IDS),
    ...parseOwnerAllowlist(env.VISTAIRE_OWNER_CLERK_USER_IDS)
  ];
}

export function getOwnerEmailAllowlist(env: OwnerPolicyEnv): string[] {
  return parseOwnerAllowlist(env.VISTAIRE_OWNER_EMAILS).map((email) =>
    email.toLowerCase()
  );
}

export function isOwnerIdentityAllowed(
  identity: OwnerIdentity,
  env: OwnerPolicyEnv
): boolean {
  const ownerUserIds = new Set(getOwnerUserIdAllowlist(env));
  const ownerEmails = new Set(getOwnerEmailAllowlist(env));

  if (identity.userId && ownerUserIds.has(identity.userId)) {
    return true;
  }

  return (identity.emailAddresses ?? []).some((email) =>
    ownerEmails.has(email.trim().toLowerCase())
  );
}
