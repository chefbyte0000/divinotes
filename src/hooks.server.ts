import { handle as authHandle } from "./auth";
import { sequence } from "@sveltejs/kit/hooks";
import { redirect, error, type Handle } from "@sveltejs/kit";

const authorizationHandle: Handle = async ({ event, resolve }) => {
	const session = await event.locals.auth();
	const path = event.url.pathname;

	if (path.startsWith("/projects") || path.startsWith("/ai") || path.startsWith("/telemetry")) {
		if (!session) {
			throw redirect(303, "/login");
		}
	}

	if (path.startsWith("/admin")) {
		if (!session) {
			throw redirect(303, "/login");
		}
		if (session.user?.role !== "admin") {
			error(403, "You do not have permission to access this area.");
		}
	}

	return resolve(event);
};

export const handle = sequence(authHandle, authorizationHandle);