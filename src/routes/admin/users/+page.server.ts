import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  createImpersonationToken,
  getActorUserId,
  impersonationCookieName,
} from "$lib/server/impersonation";

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  try {
    const userData = await db.select().from(users).orderBy(users.name);

    return {
      users: userData.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        image: user.image,
      })),
      actorUserId: getActorUserId(session) ?? "",
      allowImpersonate: !!session && !session.impersonating,
    };
  } catch (error) {
    console.error("Failed to load users:", error);
    return {
      users: [],
      actorUserId: getActorUserId(session) ?? "",
      allowImpersonate: !!session && !session.impersonating,
    };
  }
};

export const actions = {
  updateRole: async ({ request, locals }) => {
    const session = await locals.auth();
    const actorId = getActorUserId(session);
    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const newRole = formData.get("role") as string;

    if (!userId || !newRole || !actorId) {
      return fail(400, { error: "Missing required fields" });
    }

    if (userId === actorId) {
      return fail(403, { error: "You cannot change your own role." });
    }

    try {
      await db.update(users).set({ role: newRole as "admin" | "premium" | "standard" }).where(eq(users.id, userId));
      return { success: true };
    } catch (error) {
      console.error("Failed to update user role:", error);
      return fail(500, { error: "Failed to update user role" });
    }
  },

  deleteUser: async ({ request, locals }) => {
    const session = await locals.auth();
    const actorId = getActorUserId(session);
    const formData = await request.formData();
    const userId = formData.get("userId") as string;

    if (!userId || !actorId) {
      return fail(400, { error: "Missing user ID" });
    }

    if (userId === actorId) {
      return fail(403, { error: "You cannot delete your own account." });
    }

    try {
      await db.delete(users).where(eq(users.id, userId));
      return { success: true };
    } catch (error) {
      console.error("Failed to delete user:", error);
      return fail(500, { error: "Failed to delete user" });
    }
  },

  addUser: async ({ request }) => {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const role = (formData.get("role") as string) || "standard";

    if (!email) {
      return fail(400, { error: "Email is required" });
    }

    try {
      await db.insert(users).values({
        email,
        name: name || null,
        role: role as "admin" | "premium" | "standard",
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to add user:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (/unique|duplicate/i.test(msg)) {
        return fail(400, { error: "A user with this email already exists." });
      }
      return fail(500, { error: "Could not add user. Try again." });
    }
  },

  impersonateUser: async ({ request, locals, cookies }) => {
    const session = await locals.auth();

    if (session?.impersonating) {
      return fail(403, {
        error: "Stop impersonating before starting a new session.",
      });
    }

    if (!session?.user || session.user.role !== "admin") {
      return fail(403, { error: "Only admins can impersonate." });
    }

    const adminId = session.user.id;

    const formData = await request.formData();
    const targetUserId = formData.get("userId") as string;

    if (!targetUserId) {
      return fail(400, { error: "Missing user." });
    }

    if (targetUserId === adminId) {
      return fail(400, { error: "You cannot impersonate yourself." });
    }

    const [target] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!target) {
      return fail(404, { error: "User not found." });
    }

    const token = createImpersonationToken(adminId, targetUserId);
    cookies.set(impersonationCookieName, token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
    });

    redirect(303, "/");
  },
};
