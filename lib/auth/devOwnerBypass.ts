export const DEV_OWNER_BYPASS_REQUEST_HEADER = "x-vistaire-owner-e2e-bypass";
export const DEV_OWNER_BYPASS_TRUSTED_HEADER = "x-vistaire-owner-e2e-authorized";
export const DEV_OWNER_BYPASS_COOKIE = "__vistaire_owner_e2e";
export const DEV_OWNER_BYPASS_QUERY = "__vistaire_owner_e2e";

type HeaderLike = {
  get(name: string): string | null;
};

type DevBypassEnv = NodeJS.ProcessEnv & {
  VISTAIRE_OWNER_E2E_AUTH_BYPASS?: string;
  VISTAIRE_OWNER_E2E_AUTH_BYPASS_TOKEN?: string;
  VISTAIRE_OWNER_E2E_EMAIL?: string;
};

function envToken(env: DevBypassEnv): string {
  return env.VISTAIRE_OWNER_E2E_AUTH_BYPASS_TOKEN?.trim() ?? "";
}

function isLocalhostHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/:\d+$/, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

function cookieValue(headers: HeaderLike, name: string): string {
  const cookieHeader = headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return "";
}

export function isDevOwnerBypassConfigured(env: DevBypassEnv = process.env): boolean {
  return env.VISTAIRE_OWNER_E2E_AUTH_BYPASS === "1" && envToken(env).length >= 16;
}

export function shouldApplyDevOwnerBypass(
  headers: HeaderLike,
  env: DevBypassEnv = process.env
): boolean {
  if (!isDevOwnerBypassConfigured(env)) return false;

  const host = headers.get("host") ?? "";
  if (!isLocalhostHost(host)) return false;

  const token = envToken(env);
  return (
    headers.get(DEV_OWNER_BYPASS_REQUEST_HEADER) === token ||
    cookieValue(headers, DEV_OWNER_BYPASS_COOKIE) === token
  );
}

export function shouldApplyDevOwnerBypassToken(
  headers: HeaderLike,
  token: string | null | undefined,
  env: DevBypassEnv = process.env
): boolean {
  if (!isDevOwnerBypassConfigured(env)) return false;

  const host = headers.get("host") ?? "";
  if (!isLocalhostHost(host)) return false;

  return token === envToken(env);
}

export function hasTrustedDevOwnerBypass(
  headers: HeaderLike,
  env: DevBypassEnv = process.env
): boolean {
  return (
    isDevOwnerBypassConfigured(env) &&
    headers.get(DEV_OWNER_BYPASS_TRUSTED_HEADER) === "1"
  );
}

export function devOwnerBypassIdentity(env: DevBypassEnv = process.env) {
  return {
    userId: "owner-e2e-bypass",
    emailAddresses: [env.VISTAIRE_OWNER_E2E_EMAIL?.trim() || "owner-e2e@localhost"]
  };
}
