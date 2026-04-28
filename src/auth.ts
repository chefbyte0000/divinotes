import { SvelteKitAuth } from "@auth/sveltekit";
import GitHub from "@auth/sveltekit/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "$lib/server/db";
import { users, accounts, sessions } from "$lib/server/db/schema";

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
	}),
	providers: [
		GitHub({
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
		}),
	],
	callbacks: {
		session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
				session.user.role = user.role; 
			}
			return session;
		},
	},
});