import { redirect, type RequestHandler } from "@sveltejs/kit";
import { impersonationCookieName } from "$lib/server/impersonation";

/** Ends admin impersonation (clears signed cookie). */
export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete(impersonationCookieName, { path: "/" });
  redirect(303, "/");
};
