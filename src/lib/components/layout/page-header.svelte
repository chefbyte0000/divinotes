<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children?: Snippet;
  } = $props();
</script>

<div
  class="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between"
>
  <div class="space-y-1.5">
    <h1 class="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
    {#if subtitle}
      <p class="text-sm text-muted-foreground">{subtitle}</p>
    {/if}
  </div>

  {#if children}
    <div class="flex items-center gap-2">
      {@render children()}
    </div>
  {/if}
</div>
