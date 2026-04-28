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
	}
	interface User {
		role: "admin" | "premium" | "standard";
	}
}

export {};