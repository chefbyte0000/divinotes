export type LocalUserProfile = {
	version: 1;
	/** Markdown or plain text — Gemma “Distill Habits” output */
	habitInsights: string;
	lastDistilledAt: string | null;
};
