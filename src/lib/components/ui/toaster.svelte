<script lang="ts">
  import { toastStore, type ToastVariant } from "$lib/toasts/toast";
  import { cn } from "$lib/utils.js";
  import { fly } from "svelte/transition";
  import { X } from "@lucide/svelte";

  function toastSurface(variant: ToastVariant) {
    switch (variant) {
      case "success":
        return "border-emerald-500/35 bg-emerald-500/12 text-foreground";
      case "destructive":
        return "border-destructive/45 bg-destructive/12 text-foreground";
      case "info":
        return "border-sky-500/35 bg-sky-500/10 text-foreground";
      default:
        return "border-border bg-card text-card-foreground";
    }
  }
</script>

<div
  class="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col gap-2 p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-[min(calc(100vw-2rem),22rem)] sm:w-full"
  aria-live="polite"
  aria-relevant="additions text"
>
  {#each $toastStore as item (item.id)}
    <div
      class={cn(
        "pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-lg backdrop-blur-sm transition-[opacity,transform]",
        toastSurface(item.variant),
      )}
      in:fly={{ y: 8, duration: 180 }}
      out:fly={{ y: 6, duration: 140 }}
    >
      <p class="min-w-0 flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        class="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 rounded-md p-0.5 transition-colors"
        onclick={() => toastStore.dismiss(item.id)}
        aria-label="Dismiss"
      >
        <X class="size-4 opacity-70" />
      </button>
    </div>
  {/each}
</div>
