import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "impersonate";
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required for impersonation");
  return s;
}

/** Signed opaque token: admin session id + target user id + expiry */
export function createImpersonationToken(adminId: string, targetUserId: string): string {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = JSON.stringify({ adminId, targetUserId, exp });
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ p: payload, s: sig }), "utf8").toString("base64url");
}

export function parseImpersonationToken(token: string): {
  adminId: string;
  targetUserId: string;
} | null {
  try {
    const raw = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      p: string;
      s: string;
    };
    const expected = createHmac("sha256", getSecret()).update(raw.p).digest("hex");
    const a = Buffer.from(raw.s, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(raw.p) as { adminId: string; targetUserId: string; exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (!data.adminId || !data.targetUserId) return null;
    return { adminId: data.adminId, targetUserId: data.targetUserId };
  } catch {
    return null;
  }
}

export const impersonationCookieName = COOKIE;

/** The signed-in human (admin when impersonating, otherwise current user). */
export function getActorUserId(session: {
  user?: { id: string } | null;
  impersonator?: { id: string } | null;
} | null): string | undefined {
  if (!session?.user?.id) return undefined;
  return session.impersonator?.id ?? session.user.id;
}
