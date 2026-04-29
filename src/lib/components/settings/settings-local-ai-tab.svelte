<script lang="ts">
  import { onMount } from "svelte";
  import type { InitProgressReport } from "@mlc-ai/web-llm";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { bootLocalInference, getInferenceClient } from "$lib/ai/inference-bootstrap";
  import { DEFAULT_WEBLLM_MODEL_ID } from "$lib/ai/ai-protocol";
  import {
    CURATED_WEBLLM_MODELS,
    footprintLabel,
    type CuratedWebllmModel,
  } from "$lib/ai/curated-webllm-models";
  import {
    detectWebGpu,
    type WebGpuDetectionFail,
    type WebGpuDetectionOk,
  } from "$lib/ai/webgpu-detector";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Cpu from "@lucide/svelte/icons/cpu";

  const STORAGE_KEY = "divinotes-preferred-webllm-model";

  type GpuState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "ok"; detail: WebGpuDetectionOk }
    | { status: "fail"; detail: WebGpuDetectionFail };

  let gpuState = $state<GpuState>({ status: "idle" });

  let selectedId = $state(DEFAULT_WEBLLM_MODEL_ID);
  let customOpen = $state(false);
  let customId = $state("");

  let loadStage = $state<"idle" | "loading" | "ready" | "error">("idle");
  let loadError = $state<string | null>(null);
  let progressHint = $state("");
  /** 0–1 for determinate bar; null while loading before first numeric progress */
  let progressFraction = $state<number | null>(null);

  let smokePrompt = $state("Reply with one short friendly sentence.");
  let smokeOutput = $state("");
  let smokeRunning = $state(false);
  let smokeError = $state<string | null>(null);

  let rafCoalesce = 0;
  let latestReport: InitProgressReport | null = null;

  onMount(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim()) {
        selectedId = stored.trim();
        if (!CURATED_WEBLLM_MODELS.some((m) => m.id === selectedId)) {
          customOpen = true;
          customId = selectedId;
        }
      }
    } catch {
      /* ignore */
    }

    gpuState = { status: "checking" };
    void detectWebGpu().then((r) => {
      gpuState = r.ok ? { status: "ok", detail: r } : { status: "fail", detail: r };
    });
  });

  function persistSelection(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  function pickModel(m: CuratedWebllmModel) {
    selectedId = m.id;
    customOpen = false;
    persistSelection(m.id);
  }

  function toggleCustom() {
    customOpen = !customOpen;
    if (customOpen && !customId.trim()) {
      customId = selectedId;
    }
  }

  function fractionFromReport(report: InitProgressReport): number | null {
    const r = report as { progress?: unknown };
    return typeof r.progress === "number" ? Math.min(1, Math.max(0, r.progress)) : null;
  }

  function textFromReport(report: InitProgressReport): string {
    const r = report as { text?: unknown };
    return typeof r.text === "string" ? r.text : "";
  }

  function scheduleProgress(report: InitProgressReport) {
    latestReport = report;
    if (rafCoalesce) return;
    rafCoalesce = requestAnimationFrame(() => {
      rafCoalesce = 0;
      const r = latestReport;
      latestReport = null;
      if (!r) return;
      const t = textFromReport(r);
      if (t) progressHint = t;
      const f = fractionFromReport(r);
      if (f != null) progressFraction = f;
    });
  }

  function effectiveModelId(): string {
    if (customOpen && customId.trim()) return customId.trim();
    return selectedId;
  }

  async function loadModel() {
    loadError = null;
    progressHint = "";
    progressFraction = null;
    loadStage = "loading";

    const id = effectiveModelId();
    persistSelection(id);

    try {
      await bootLocalInference({
        modelId: id || DEFAULT_WEBLLM_MODEL_ID,
        onProgress: scheduleProgress,
      });
      loadStage = "ready";
    } catch (e) {
      loadStage = "error";
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  async function runSmokeTest() {
    const client = getInferenceClient();
    if (!client || loadStage !== "ready") return;

    smokeRunning = true;
    smokeError = null;
    smokeOutput = "";

    try {
      for await (const chunk of client.generateCompletion({
        mode: "chat",
        messages: [{ role: "user", content: smokePrompt }],
        stream: true,
        temperature: 0.65,
        max_tokens: 220,
      })) {
        smokeOutput += chunk;
      }
    } catch (e) {
      smokeError = e instanceof Error ? e.message : String(e);
    } finally {
      smokeRunning = false;
    }
  }

  let barScale = $derived(progressFraction ?? 0);
  let indeterminate = $derived(loadStage === "loading" && progressFraction === null);
</script>

<div class="space-y-8">
  <header class="space-y-1">
    <h2 class="text-lg font-semibold tracking-tight">Local AI</h2>
    <p class="text-muted-foreground max-w-xl text-sm leading-relaxed">
      Models run entirely in your browser via WebGPU. Pick a weight, download once (cached), then
      features that use on-device inference can share the same engine.
    </p>
  </header>

  <section class="border-border bg-card/80 space-y-3 rounded-xl border p-5 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
    <div class="flex items-center gap-2">
      <Cpu class="text-muted-foreground h-4 w-4" />
      <h3 class="text-sm font-medium">Hardware</h3>
    </div>
    {#if gpuState.status === "idle" || gpuState.status === "checking"}
      <p class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircle class="h-4 w-4 shrink-0 animate-spin opacity-70" />
        Probing WebGPU…
      </p>
    {:else if gpuState.status === "ok"}
      <p class="text-sm text-emerald-600 dark:text-emerald-400">
        WebGPU ready · {gpuState.detail.tier}{gpuState.detail.integratedLikely
          ? " · integrated GPU"
          : ""}
      </p>
    {:else}
      <div class="space-y-1">
        <p class="text-destructive text-sm font-medium">{gpuState.detail.title}</p>
        <p class="text-muted-foreground text-sm">{gpuState.detail.description}</p>
      </div>
    {/if}
  </section>

  <section class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 class="text-sm font-medium">Model</h3>
        <p class="text-muted-foreground mt-0.5 text-xs">Quantized MLC builds — smaller = faster download.</p>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      {#each CURATED_WEBLLM_MODELS as m (m.id)}
        <button
          type="button"
          disabled={loadStage === "loading"}
          onclick={() => pickModel(m)}
          class="localai-model-card bg-card border-border text-left transition-[box-shadow,transform,border-color] duration-200 ease-out {selectedId === m.id && !customOpen
            ? 'border-primary shadow-md ring-2 ring-primary/25'
            : 'hover:border-primary/40 hover:shadow-sm'}"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-semibold tracking-tight">{m.name}</span>
            <span
              class="text-[10px] font-medium uppercase tracking-wide opacity-80 {m.footprint === 'light'
                ? 'text-emerald-600 dark:text-emerald-400'
                : m.footprint === 'medium'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-orange-700 dark:text-orange-400'}"
            >
              {footprintLabel(m.footprint)}
            </span>
          </div>
          <p class="text-muted-foreground mt-1.5 text-xs leading-relaxed">{m.tagline}</p>
          <p class="text-muted-foreground/80 mt-2 font-mono text-[10px] leading-none break-all">
            {m.id}
          </p>
        </button>
      {/each}
    </div>

    <div class="border-border bg-muted/25 space-y-3 rounded-xl border p-4">
      <button
        type="button"
        class="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-left text-xs font-medium"
        onclick={toggleCustom}
      >
        Custom model ID
        <span class="opacity-60">{customOpen ? "−" : "+"}</span>
      </button>
      {#if customOpen}
        <Input
          bind:value={customId}
          placeholder="e.g. Llama-3.2-1B-Instruct-q4f16_1-MLC"
          spellcheck={false}
          disabled={loadStage === "loading"}
          class="font-mono text-xs"
        />
        <p class="text-muted-foreground text-[11px] leading-relaxed">
          Paste any prebuilt ID from the WebLLM model list. Invalid IDs fail with a clear error.
        </p>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <Button
        onclick={loadModel}
        disabled={loadStage === "loading" || gpuState.status === "fail"}
        class="relative overflow-hidden"
      >
        {#if loadStage === "loading"}
          <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
          Preparing model…
        {:else if loadStage === "ready"}
          <Sparkles class="mr-2 h-4 w-4" />
          Re-download / switch model
        {:else}
          Download &amp; load into GPU
        {/if}
      </Button>
      {#if loadStage === "ready"}
        <span class="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span class="bg-emerald-500/85 h-1.5 w-1.5 animate-pulse rounded-full"></span>
          Loaded in this tab
        </span>
      {/if}
    </div>

    {#if loadStage === "error" && loadError}
      <p class="text-destructive max-w-prose text-sm">{loadError}</p>
    {/if}

    {#if loadStage === "loading"}
      <div class="localai-progress-shell border-border bg-card/60 space-y-3 rounded-xl border p-4 shadow-inner">
        <div class="localai-bar-track" aria-hidden="true">
          {#if indeterminate}
            <div class="localai-bar-indeterminate"></div>
          {:else}
            <div
              class="localai-bar-fill"
              style={`transform: scaleX(${Math.max(0.02, barScale)})`}
            ></div>
          {/if}
        </div>
        <div class="flex items-start justify-between gap-3">
          <p class="text-muted-foreground line-clamp-3 flex-1 font-mono text-[11px] leading-snug break-all">
            {progressHint || "Fetching weights and compiling shaders…"}
          </p>
          {#if progressFraction != null}
            <span class="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
              {Math.round(progressFraction * 100)}%
            </span>
          {/if}
        </div>
      </div>
    {/if}
  </section>

  <section class="border-border bg-card/80 space-y-4 rounded-xl border p-5 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
    <h3 class="text-sm font-medium">Quick test</h3>
    <Textarea bind:value={smokePrompt} rows={3} disabled={smokeRunning} class="text-sm" />
    <Button
      variant="secondary"
      size="sm"
      onclick={runSmokeTest}
      disabled={loadStage !== "ready" || smokeRunning || gpuState.status === "fail"}
    >
      {#if smokeRunning}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Streaming…
      {:else}
        Run sample completion
      {/if}
    </Button>
    {#if smokeError}
      <p class="text-destructive text-sm">{smokeError}</p>
    {/if}
    {#if smokeOutput}
      <div
        class="border-border bg-muted/30 max-h-64 overflow-auto rounded-lg border p-3 text-sm whitespace-pre-wrap"
      >
        {smokeOutput}
      </div>
    {/if}
  </section>
</div>

<style>
  .localai-model-card {
    border-radius: var(--radius);
    border-width: 1px;
    padding: 1rem 1rem 0.875rem;
  }

  .localai-progress-shell {
    contain: content;
  }

  .localai-bar-track {
    position: relative;
    height: 0.55rem;
    width: 100%;
    overflow: hidden;
    border-radius: 9999px;
    background: oklch(from var(--muted) l c h / 0.55);
    box-shadow: inset 0 1px 2px oklch(0 0 0 / 0.06);
  }

  .localai-bar-fill {
    position: absolute;
    inset: 0;
    transform-origin: left center;
    border-radius: 9999px;
    will-change: transform;
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
    background: linear-gradient(
      105deg,
      var(--chart-2),
      var(--primary),
      var(--chart-4),
      var(--chart-2)
    );
    background-size: 200% 100%;
    animation: localai-bar-shimmer 2.4s linear infinite;
  }

  .localai-bar-indeterminate {
    position: absolute;
    inset: 0 auto 0 0;
    width: 42%;
    border-radius: 9999px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--primary),
      var(--chart-2),
      transparent
    );
    animation: localai-bar-sweep 1.15s ease-in-out infinite;
    will-change: transform, opacity;
  }

  @keyframes localai-bar-shimmer {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 200% 50%;
    }
  }

  @keyframes localai-bar-sweep {
    0% {
      transform: translateX(-100%);
      opacity: 0.65;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translateX(320%);
      opacity: 0.65;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .localai-bar-fill {
      animation: none;
    }
    .localai-bar-indeterminate {
      animation: none;
      width: 100%;
      opacity: 0.35;
    }
  }
</style>
