/**
 * Reactive facade over {@link loadLocalUserProfile} — still **IndexedDB only**, never synced.
 */
import { browser } from "$app/environment";
import type { LocalUserProfile } from "./local-user-profile-types";
import { loadLocalUserProfile, upsertHabitInsights } from "./local-user-profile-db";

export type { LocalUserProfile };

export const userProfile = $state<{ current: LocalUserProfile | null }>({ current: null });

export async function hydrateUserProfile(): Promise<void> {
	if (!browser) return;
	userProfile.current = await loadLocalUserProfile();
}

export async function saveHabitInsights(insights: string): Promise<void> {
	if (!browser) return;
	await upsertHabitInsights(insights);
	userProfile.current = await loadLocalUserProfile();
}
