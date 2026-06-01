const MAX_OWNER_3D_SEGMENT_LENGTH = 80;
const MAX_OWNER_3D_SEGMENT_INPUT_LENGTH = 512;
const MAX_OWNER_3D_AUDIT_ID_LENGTH = 240;

export function cleanOwner3dPathSegment(value: string): string {
  const bounded = value.slice(0, MAX_OWNER_3D_SEGMENT_INPUT_LENGTH).toLowerCase();
  let cleaned = "";
  let replacingUnsafeRun = false;

  for (
    let index = 0;
    index < bounded.length && cleaned.length < MAX_OWNER_3D_SEGMENT_LENGTH;
    index += 1
  ) {
    const code = bounded.charCodeAt(index);
    const safe =
      (code >= 48 && code <= 57) ||
      (code >= 97 && code <= 122) ||
      code === 45 ||
      code === 46 ||
      code === 95;

    if (safe) {
      cleaned += bounded[index];
      replacingUnsafeRun = false;
    } else if (!replacingUnsafeRun) {
      cleaned += "-";
      replacingUnsafeRun = true;
    }
  }

  let start = 0;
  while (start < cleaned.length && cleaned.charCodeAt(start) === 45) start += 1;

  let end = cleaned.length;
  while (end > start && cleaned.charCodeAt(end - 1) === 45) end -= 1;

  return cleaned.slice(start, end);
}

export function cleanOwner3dDashId(value: string, fallback: string): string {
  const bounded = value.slice(0, MAX_OWNER_3D_SEGMENT_INPUT_LENGTH).toLowerCase();
  let cleaned = "";
  let dashRun = true;

  for (
    let index = 0;
    index < bounded.length && cleaned.length < MAX_OWNER_3D_SEGMENT_LENGTH;
    index += 1
  ) {
    const code = bounded.charCodeAt(index);
    const safe = (code >= 48 && code <= 57) || (code >= 97 && code <= 122);

    if (safe) {
      cleaned += bounded[index];
      dashRun = false;
    } else if (!dashRun) {
      cleaned += "-";
      dashRun = true;
    }
  }

  if (cleaned.endsWith("-")) cleaned = cleaned.slice(0, -1);
  return cleaned || fallback;
}

export function cleanOwner3dAuditId(parts: Array<string | null | undefined>): string {
  const bounded = parts.filter(Boolean).join(":").slice(0, MAX_OWNER_3D_SEGMENT_INPUT_LENGTH);
  let cleaned = "";
  let replacementRun = false;

  for (
    let index = 0;
    index < bounded.length && cleaned.length < MAX_OWNER_3D_AUDIT_ID_LENGTH;
    index += 1
  ) {
    const code = bounded.charCodeAt(index);
    const safe =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 45 ||
      code === 46 ||
      code === 47 ||
      code === 58 ||
      code === 64 ||
      code === 95;

    if (safe) {
      cleaned += bounded[index];
      replacementRun = false;
    } else if (!replacementRun) {
      cleaned += "-";
      replacementRun = true;
    }
  }

  return cleaned || "owner-3d-audit-event";
}
