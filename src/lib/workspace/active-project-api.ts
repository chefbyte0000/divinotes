import { getContext } from "svelte";

export const ACTIVE_PROJECT_KEY = Symbol("divinotes:active-project");

/** Bound to router + workspace rules — use for UI labels and local AI prompt boundaries. */
export type ActiveProjectApi = {
	readonly activeProjectId: string | null;
	aiContextDirective(): string;
};

export function tryGetActiveProject(): ActiveProjectApi | undefined {
	return getContext<ActiveProjectApi | undefined>(ACTIVE_PROJECT_KEY);
}
