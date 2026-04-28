import { DefaultSession } from "@auth/sveltekit";

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Extend the Auth.js types to include your specific roles
declare module "@auth/sveltekit" {
	interface Session {
		user: {
			id: string;
			role: "admin" | "premium" | "standard";
		} & DefaultSession["user"];
		/** True when an admin is viewing the app as another user */
		impersonating?: boolean;
		/** The signed-in admin (only set while impersonating) */
		impersonator?: {
			id: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			role: "admin" | "premium" | "standard";
		};
	}
	interface User {
		role: "admin" | "premium" | "standard";
	}
}

export {};