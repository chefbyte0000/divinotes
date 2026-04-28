<script lang="ts">
  import { cn } from "$lib/utils";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { NudgeOffer } from "$lib/nudge/NudgeController";

  let {
    offer,
    variant = "floating",
    class: className,
    onDismiss,
    onPrimary,
  }: {
    offer: NudgeOffer | null;
    /** Floating chip (corner) vs slim strip above content */
    variant?: "floating" | "inline";
    class?: string;
    onDismiss?: () => void;
    onPrimary?: () => void;
  } = $props();
</script>

{#if offer}
  {#if variant === "floating"}
    <div
      role="status"
      class={cn(
        "border-border bg-card/92 text-card-foreground shadow-xs animate-in fade-in slide-in-from-bottom-4 fixed bottom-5 right-5 z-40 flex max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-xl border p-3 pb-2 backdrop-blur-md duration-300 md:bottom-8 md:right-8",
        className,
      )}
    >
      <div class="min-w-0 space-y-1">
        <p class="text-[13px] font-medium leading-snug tracking-tight">{offer.title}</p>
        {#if offer.description}
          <p class="text-muted-foreground text-[12px] leading-relaxed">
            {offer.description}
          </p>
        {/if}
      </div>
      <div class="flex flex-wrap items-center justify-end gap-1 pt-0.5">
        {#if offer.primary && onPrimary}
          <Button type="button" variant="ghost" size="sm" class="h-8 px-2.5 text-[12px]" onclick={onPrimary}>
            {offer.primary.label}
          </Button>
        {/if}
        <Button type="button" variant="ghost" size="sm" class="text-muted-foreground h-8 px-2.5 text-[12px]" onclick={onDismiss}>
          {offer.dismissLabel ?? "Dismiss"}
        </Button>
      </div>
    </div>
  {:else}
    <div
      role="status"
      class={cn(
        "border-border/70 bg-muted/20 animate-in fade-in slide-in-from-top-2 flex flex-col gap-2 border-b pb-3 duration-300 ease-out md:flex-row md:items-center md:justify-between md:gap-4 md:pb-2.5",
        className,
      )}
    >
      <div class="min-w-0 flex-1 space-y-0.5">
        <p class="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em]">
          Nudge
        </p>
        <p class="text-[13px] font-medium leading-snug">{offer.title}</p>
        {#if offer.description}
          <p class="text-muted-foreground text-[12px] leading-relaxed">
            {offer.description}
          </p>
        {/if}
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-1 md:justify-end">
        {#if offer.primary && onPrimary}
          <Button type="button" variant="ghost" size="sm" class="h-8 px-2.5 text-[12px]" onclick={onPrimary}>
            {offer.primary.label}
          </Button>
        {/if}
        <Button type="button" variant="ghost" size="sm" class="text-muted-foreground h-8 px-2.5 text-[12px]" onclick={onDismiss}>
          {offer.dismissLabel ?? "Dismiss"}
        </Button>
      </div>
    </div>
  {/if}
{/if}
