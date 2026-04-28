<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    getStorageEstimate,
    isStoragePersisted,
    requestPersistentStorage,
  } from "$lib/ai/persistent-storage";
  import type { ModelOnboardingStage } from "$lib/ai/model-onboarding-run";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Download from "@lucide/svelte/icons/download";
  import Cpu from "@lucide/svelte/icons/cpu";
  import CircleCheck from "@lucide/svelte/icons/circle-check";

  let {
    stage,
    downloadPercent = 0,
  }: {
    stage: ModelOnboardingStage;
    /** 0–100 for the Downloading stage only */
    downloadPercent?: number;
  } = $props();

  let persisted = $state<boolean | null>(null);
  let quotaLabel = $state<string | null>(null);

  const stages: { id: ModelOnboardingStage; label: string }[] = [
    { id: "downloading", label: "Downloading" },
    { id: "compiling_shaders", label: "Compiling shaders" },
    { id: "ready", label: "Ready" },
  ];

  let activeIndex = $derived(stages.findIndex((s) => s.id === stage));

  /** Visual fill 0–100 for the unified bar */
  let barPercent = $derived.by(() => {
    const idx = Math.max(0, activeIndex);
    if (stage === "ready") return 100;
    if (stage === "compiling_shaders") {
      return 33.34 + 33.33 * 0.65;
    }
    const third = 100 / 3;
    return Math.min(third, (downloadPercent / 100) * third);
  });

  onMount(() => {
    void refreshPersistState();
  });

  async function refreshPersistState() {
    persisted = await isStoragePersisted();
    const est = await getStorageEstimate();
    quotaLabel =
      est != null ? `${formatBytes(est.usageBytes)} of ${formatBytes(est.quotaBytes)} used` : null;
  }

  async function onPersistClick() {
    await requestPersistentStorage();
    await refreshPersistState();
  }

  function formatBytes(n: number): string {
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
    if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
    return `${Math.round(n / 1024)} KB`;
  }
</script>

<div
  class="border-border bg-card text-card-foreground ring-border/40 flex w-full max-w-lg flex-col gap-5 rounded-xl border p-6 shadow-sm ring-1"
>
  <div class="space-y-1">
    <h2 class="text-base font-semibold tracking-tight">Local model setup</h2>
    <p class="text-muted-foreground text-sm leading-relaxed">
      We cache model weights (~5 GB) with the Cache Storage API. Ask the browser for persistent
      storage so cleanup is less likely to remove them.
    </p>
  </div>

  <div class="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border px-4 py-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-2">
        <ShieldCheck
          class="text-primary mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <div class="min-w-0 space-y-1">
          <p class="text-sm font-medium">Persistent storage</p>
          <p class="text-muted-foreground text-xs leading-relaxed">
            Grants stronger eviction protection for this origin’s cached data (models + offline use).
          </p>
          {#if quotaLabel}
            <p class="text-muted-foreground font-mono text-[11px]">{quotaLabel}</p>
          {/if}
        </div>
      </div>
      <Button size="sm" variant="secondary" class="shrink-0" onclick={onPersistClick}>
        Request permission
      </Button>
    </div>
    {#if persisted === true}
      <p class="text-emerald-600 dark:text-emerald-400 text-xs font-medium" role="status">
        Persistent storage is active.
      </p>
    {:else if persisted === false}
      <p class="text-muted-foreground text-xs" role="status">
        Not persisted yet — tap the button (best after interaction). The browser may still grant it
        automatically when engagement is high.
      </p>
    {/if}
  </div>

  <div class="space-y-3">
    <div class="text-muted-foreground flex justify-between gap-2 text-xs font-medium">
      {#each stages as s, i (s.id)}
        <span class="flex min-w-0 flex-1 items-center gap-1.5 {i <= activeIndex ? 'text-foreground' : ''}">
          {#if s.id === "downloading"}
            <Download class="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
          {:else if s.id === "compiling_shaders"}
            <Cpu class="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
          {:else}
            <CircleCheck class="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
          {/if}
          <span class="truncate">{s.label}</span>
        </span>
      {/each}
    </div>

    <div
      class="bg-muted relative h-2.5 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(barPercent)}
      aria-label="Model onboarding progress"
    >
      <div
        class="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
        style:width="{barPercent}%"
      ></div>
    </div>

    <p class="text-muted-foreground text-xs">
      {#if stage === "downloading"}
        Downloading model shards… {Math.round(downloadPercent)}%
      {:else if stage === "compiling_shaders"}
        Compiling WebGPU shaders — first launch can take a minute.
      {:else}
        Model cache is ready for on-device inference.
      {/if}
    </p>
  </div>
</div>
