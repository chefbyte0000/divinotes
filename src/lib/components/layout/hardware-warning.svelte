<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    detectWebGpu,
    AI_DELIVERY_MODE_KEY,
    setStoredAiDeliveryMode,
    type WebGpuDetectionFail,
  } from "$lib/ai/webgpu-detector";
  import Cpu from "@lucide/svelte/icons/cpu";

  let open = $state(false);
  let failure = $state<WebGpuDetectionFail | null>(null);

  onMount(() => {
    if (localStorage.getItem(AI_DELIVERY_MODE_KEY) === "cloud-only-v2") return;

    let cancelled = false;
    void detectWebGpu().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        failure = result;
        open = true;
      }
    });

    return () => {
      cancelled = true;
    };
  });

  function useCloudOnly() {
    setStoredAiDeliveryMode("cloud-only-v2");
    open = false;
  }
</script>

{#if open && failure}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center p-6"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="hw-warn-title"
    aria-describedby="hw-warn-desc"
  >
    <div class="bg-background/80 absolute inset-0 backdrop-blur-sm"></div>
    <div
      class="border-border bg-card text-card-foreground ring-border/40 relative z-[1] flex w-full max-w-md flex-col gap-4 rounded-xl border p-6 shadow-lg ring-1"
    >
      <div class="flex gap-3">
        <div
          class="bg-amber-500/15 text-amber-700 dark:text-amber-300 flex size-10 shrink-0 items-center justify-center rounded-lg"
        >
          <Cpu class="size-5" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1 space-y-2">
          <h2 id="hw-warn-title" class="text-base leading-snug font-semibold tracking-tight">
            {failure.title}
          </h2>
          <p id="hw-warn-desc" class="text-muted-foreground text-sm leading-relaxed">
            {failure.description}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" class="w-full sm:w-auto" onclick={useCloudOnly}>
          Continue with Cloud-only (V2)
        </Button>
      </div>

      <p class="text-muted-foreground text-xs leading-relaxed">
        On-device AI requires WebGPU. Cloud-only mode will use remote inference when Divinotes ships
        it — local notes stay local; only prompts you send would leave your device.
      </p>
    </div>
  </div>
{/if}
