<script lang="ts">
  let { text }: { text: string } = $props();
  const t = $derived(text?.trim() ?? "");
</script>

{#if t}
  <p class="text-muted-foreground line-clamp-1 max-w-full text-sm leading-snug" title={t}>{t}</p>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
