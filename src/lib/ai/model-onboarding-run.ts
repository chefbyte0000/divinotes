import { ModelManager, type ModelArtifactDownloadEvent } from "./model-manager";

export type ModelOnboardingStage = "downloading" | "compiling_shaders" | "ready";

export type RunLocalModelOnboardingOptions = {
	artifactUrls: readonly string[];
	manager?: ModelManager;
	signal?: AbortSignal;
	onStage: (stage: ModelOnboardingStage) => void;
	onDownloadPercent: (percent: number) => void;
	/** WebLLM / runtime shader compile — wired when inference stack exists */
	compileShaderPipeline?: () => Promise<void>;
};

function percentFromProgress(ev: ModelArtifactDownloadEvent): number {
	if (ev.overallTotalBytes != null && ev.overallTotalBytes > 0) {
		return Math.min(100, Math.round((ev.overallLoadedBytes / ev.overallTotalBytes) * 100));
	}
	if (ev.totalBytes != null && ev.totalBytes > 0) {
		return Math.min(100, Math.round((ev.loadedBytes / ev.totalBytes) * 100));
	}
	return 0;
}

/**
 * Orchestrates Cache Storage download, optional shader compile hook, then Ready.
 */
export async function runLocalModelOnboarding(
	options: RunLocalModelOnboardingOptions,
): Promise<void> {
	const mgr = options.manager ?? new ModelManager();

	options.onStage("downloading");
	options.onDownloadPercent(0);

	await mgr.ensureAllCached(options.artifactUrls, {
		signal: options.signal,
		onProgress: (ev) => {
			options.onDownloadPercent(percentFromProgress(ev));
		},
	});

	options.onStage("compiling_shaders");
	options.onDownloadPercent(100);

	await options.compileShaderPipeline?.();

	options.onStage("ready");
}
