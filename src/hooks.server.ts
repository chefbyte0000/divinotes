import { handle as authHandle } from "./auth";
import { sequence } from "@sveltejs/kit/hooks";
import { redirect, error, type Handle } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import {
  impersonationCookieName,
  parseImpersonationToken,
} from "$lib/server/impersonation";

/** Wrap Auth.js session so admins can view the app as another user (signed cookie). */
const impersonationHandle: Handle = async ({ event, resolve }) => {
  const auth = event.locals.auth;
  if (!auth) return resolve(event);

  event.locals.auth = async () => {
    const session = await auth();
    if (!session?.user?.id) return session;

    const token = event.cookies.get(impersonationCookieName);
    if (!token) return session;

    const parsed = parseImpersonationToken(token);
    if (!parsed) {
      event.cookies.delete(impersonationCookieName, { path: "/" });
      return session;
    }

    // JWT session must still be the admin who started impersonation
    if (parsed.adminId !== session.user.id || session.user.role !== "admin") {
      event.cookies.delete(impersonationCookieName, { path: "/" });
      return session;
    }

    const [target] = await db.select().from(users).where(eq(users.id, parsed.targetUserId)).limit(1);
    if (!target) {
      event.cookies.delete(impersonationCookieName, { path: "/" });
      return session;
    }

    const impersonator = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: session.user.role,
    };

    return {
      ...session,
      user: {
        ...session.user,
        id: target.id,
        name: target.name,
        email: target.email,
        image: target.image,
        role: target.role,
      },
      impersonating: true,
      impersonator,
    };
  };

  return resolve(event);
};

const authorizationHandle: Handle = async ({ event, resolve }) => {
  const session = await event.locals.auth();
  const path = event.url.pathname;

  if (
    path.startsWith("/projects") ||
    path.startsWith("/project/") ||
    path.startsWith("/inbox") ||
    path.startsWith("/ai") ||
    path.startsWith("/telemetry")
  ) {
    if (!session) {
      throw redirect(303, "/login");
    }
  }

  if (path.startsWith("/admin")) {
    if (!session) {
      throw redirect(303, "/login");
    }
    const adminGateRole = session.impersonator?.role ?? session.user?.role;
    if (adminGateRole !== "admin") {
      error(403, "You do not have permission to access this area.");
    }
  }

  return resolve(event);
};

export const handle = sequence(authHandle, impersonationHandle, authorizationHandle);
