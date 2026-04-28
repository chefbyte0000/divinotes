import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { fail } from "@sveltejs/kit";

export async function load() {
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
    };
  } catch (error) {
    console.error("Failed to load users:", error);
    return {
      users: [],
    };
  }
}

export const actions = {
  updateRole: async ({ request }) => {
    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const newRole = formData.get("role") as string;

    if (!userId || !newRole) {
      return fail(400, { error: "Missing required fields" });
    }

    try {
      await db.update(users).set({ role: newRole as any }).where(eq(users.id, userId));
      return { success: true };
    } catch (error) {
      console.error("Failed to update user role:", error);
      return fail(500, { error: "Failed to update user role" });
    }
  },

  deleteUser: async ({ request }) => {
    const formData = await request.formData();
    const userId = formData.get("userId") as string;

    if (!userId) {
      return fail(400, { error: "Missing user ID" });
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
        role: role as any,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to add user:", error);
      return fail(500, { error: "Failed to add user" });
    }
  },
};
