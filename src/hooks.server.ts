import { handle as authHandle } from "./auth";
import { sequence } from "@sveltejs/kit/hooks";
import { redirect, type Handle } from "@sveltejs/kit";

const authorizationHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith("/projects") || event.url.pathname.startsWith("/ai")) {
		const session = await event.locals.auth();
		if (!session) {
			throw redirect(303, "/login");
		}
	}

	return resolve(event);
};

// Sequence runs Auth first, then our custom protection logic
export const handle = sequence(authHandle, authorizationHandle);