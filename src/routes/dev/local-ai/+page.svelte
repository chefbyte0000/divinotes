<script lang="ts">
  import { onMount } from "svelte";
  import type { InitProgressReport } from "@mlc-ai/web-llm";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import {
    bootLocalInference,
    getInferenceClient,
  } from "$lib/ai/inference-bootstrap";
  import { DEFAULT_WEBLLM_MODEL_ID } from "$lib/ai/ai-protocol";
  import {
    detectWebGpu,
    type WebGpuDetectionFail,
    type WebGpuDetectionOk,
  } from "$lib/ai/webgpu-detector";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";

  type GpuState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "ok"; detail: WebGpuDetectionOk }
    | { status: "fail"; detail: WebGpuDetectionFail };

  let gpuState = $state<GpuState>({ status: "idle" });

  let modelId = $state(DEFAULT_WEBLLM_MODEL_ID);
  let loadStage = $state<"idle" | "loading" | "ready" | "error">("idle");
  let loadError = $state<string | null>(null);
  let progressHint = $state<string>("");
  let progressFraction = $state<number | null>(null);

  let smokePrompt = $state("Say hello in one short sentence.");
  let smokeOutput = $state("");
  let smokeRunning = $state(false);
  let smokeError = $state<string | null>(null);

  onMount(() => {
    gpuState = { status: "checking" };
    void detectWebGpu().then((r) => {
      if (r.ok) {
        gpuState = { status: "ok", detail: r };
      } else {
        gpuState = { status: "fail", detail: r };
      }
    });
  });

  function fractionFromReport(report: InitProgressReport): number | null {
    const r = report as { progress?: unknown };
    return typeof r.progress === "number" ? Math.min(1, Math.max(0, r.progress)) : null;
  }

  function textFromReport(report: InitProgressReport): string {
    const r = report as { text?: unknown };
    return typeof r.text === "string" ? r.text : "";
  }

  async function loadModel() {
    loadError = null;
    progressHint = "";
    progressFraction = null;
    loadStage = "loading";

    try {
      await bootLocalInference({
        modelId: modelId.trim() || DEFAULT_WEBLLM_MODEL_ID,
        onProgress: (report) => {
          progressHint = textFromReport(report) || progressHint;
          progressFraction = fractionFromReport(report);
        },
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
        temperature: 0.7,
        max_tokens: 256,
      })) {
        smokeOutput += chunk;
      }
    } catch (e) {
      smokeError = e instanceof Error ? e.message : String(e);
    } finally {
      smokeRunning = false;
    }
  }
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10 md:px-8">
  <div class="space-y-2">
    <h1 class="text-xl font-semibold tracking-tight">Local AI smoke test</h1>
    <p class="text-muted-foreground text-sm leading-relaxed">
      Loads the WebLLM worker (<code class="text-xs">MLCEngine.reload</code>) with an MLC prebuilt
      model ID, then streams a short chat reply. Use a small model for quick iteration; larger IDs
      (e.g. Gemma-class) must match MLC’s catalog names exactly.
    </p>
  </div>

  <section class="border-border bg-card space-y-3 rounded-xl border p-5 shadow-sm">
    <h2 class="text-sm font-medium">WebGPU</h2>
    {#if gpuState.status === "idle" || gpuState.status === "checking"}
      <p class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircle class="text-muted-foreground h-4 w-4 animate-spin" />
        Checking adapter…
      </p>
    {:else if gpuState.status === "ok"}
      <p class="text-sm text-emerald-600 dark:text-emerald-400">
        Ready ({gpuState.detail.tier}{gpuState.detail.integratedLikely
          ? ", integrated likely"
          : ""}).
      </p>
    {:else}
      <div class="space-y-1">
        <p class="text-destructive text-sm font-medium">{gpuState.detail.title}</p>
        <p class="text-muted-foreground text-sm">{gpuState.detail.description}</p>
      </div>
    {/if}
  </section>

  <section class="border-border bg-card space-y-4 rounded-xl border p-5 shadow-sm">
    <h2 class="text-sm font-medium">Model</h2>
    <div class="space-y-2">
      <label class="text-muted-foreground text-xs font-medium" for="model-id"
        >MLC model ID</label
      >
      <Input id="model-id" bind:value={modelId} spellcheck={false} />
      <p class="text-muted-foreground text-xs">
        Default: <code class="text-[11px]">{DEFAULT_WEBLLM_MODEL_ID}</code> — swap for any valid
        prebuilt ID from the WebLLM / MLC docs.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <Button
        onclick={loadModel}
        disabled={loadStage === "loading" || gpuState.status === "fail"}
      >
        {#if loadStage === "loading"}
          <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
          Loading…
        {:else}
          Download &amp; load model
        {/if}
      </Button>
      {#if loadStage === "ready"}
        <span class="text-muted-foreground text-xs">Model loaded in this tab.</span>
      {/if}
      {#if loadStage === "error" && loadError}
        <span class="text-destructive max-w-md text-xs">{loadError}</span>
      {/if}
    </div>

    {#if loadStage === "loading"}
      <div class="space-y-2">
        {#if progressFraction != null}
          <div class="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              class="bg-primary h-full transition-[width] duration-300 ease-out"
              style={`width: ${Math.round(progressFraction * 100)}%`}
            ></div>
          </div>
        {/if}
        {#if progressHint}
          <p class="text-muted-foreground font-mono text-[11px] leading-snug break-all">
            {progressHint}
          </p>
        {/if}
      </div>
    {/if}
  </section>

  <section class="border-border bg-card space-y-4 rounded-xl border p-5 shadow-sm">
    <h2 class="text-sm font-medium">Smoke test</h2>
    <div class="space-y-2">
      <label class="text-muted-foreground text-xs font-medium" for="smoke-prompt">Prompt</label>
      <Textarea id="smoke-prompt" bind:value={smokePrompt} rows={3} disabled={smokeRunning} />
    </div>
    <Button
      variant="secondary"
      onclick={runSmokeTest}
      disabled={loadStage !== "ready" || smokeRunning || gpuState.status === "fail"}
    >
      {#if smokeRunning}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Generating…
      {:else}
        Run chat completion
      {/if}
    </Button>
    {#if smokeError}
      <p class="text-destructive text-sm">{smokeError}</p>
    {/if}
    {#if smokeOutput}
      <div
        class="border-border bg-muted/30 max-h-80 overflow-auto rounded-lg border p-3 text-sm whitespace-pre-wrap"
      >
        {smokeOutput}
      </div>
    {/if}
  </section>
</div>
