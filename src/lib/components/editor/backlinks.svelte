<script lang="ts">
  let {
    backlinks,
  }: {
    backlinks: { id: string; title: string }[];
  } = $props();
</script>

{#if backlinks.length > 0}
  <section class="border-border mt-10 border-t pt-8">
    <h2 class="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
      Backlinks
    </h2>
    <ul class="flex flex-col gap-2">
      {#each backlinks as b (b.id)}
        <li>
          <a
            class="text-primary text-sm font-medium underline underline-offset-4 hover:opacity-90"
            href="/note/{b.id}"
          >
            {b.title?.trim() ? b.title : "Untitled note"}
          </a>
        </li>
      {/each}
    </ul>
    <p class="text-muted-foreground mt-3 text-xs leading-relaxed">
      Other notes in this silo that link to this note ({backlinks.length}).
    </p>
  </section>
{/if}
