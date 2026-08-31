import { isDevBypassEnabled } from "@/lib/dev-flags";

export const DEV_SESSION_COOKIE = "hz_dev_session";

function getSecret(): string {
  const secret = process.env.DEV_SESSION_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("Define DEV_SESSION_SECRET o CLERK_SECRET_KEY para HORIZON_DEV_BYPASS");
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payload: string): Promise<string> {
  const key = await importHmacKey(getSecret());
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createDevSessionToken(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const payload = `${userId}.${exp}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifyDevSessionToken(token: string): Promise<string | null> {
  if (!isDevBypassEnabled()) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expStr, signature] = parts;
  const payload = `${userId}.${expStr}`;
  const expected = await sign(payload);

  try {
    if (!timingSafeEqual(base64UrlDecode(signature), base64UrlDecode(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export function devSessionCookieOptions(token: string) {
  return {
    name: DEV_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function clearDevSessionCookieOptions() {
  return {
    name: DEV_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
