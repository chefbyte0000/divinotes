import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export type SettingsTab = "general" | "local-ai";

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const settingsTab: SettingsTab =
		url.searchParams.get("tab") === "local-ai" ? "local-ai" : "general";

	return { settingsTab };
};
