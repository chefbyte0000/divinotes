<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { UserRound } from "@lucide/svelte";

  let {
    targetEmail,
    targetName,
  }: {
    targetEmail?: string | null;
    targetName?: string | null;
  } = $props();

  const label = $derived(targetName?.trim() || targetEmail || "another user");
</script>

<div
  class="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100"
  role="status"
>
  <div class="flex min-w-0 items-center gap-2">
    <UserRound class="size-4 shrink-0 opacity-80" aria-hidden="true" />
    <span class="min-w-0">
      Viewing as <strong class="font-semibold">{label}</strong>
    </span>
  </div>
  <form method="POST" action="/api/stop-impersonating" class="shrink-0">
    <Button type="submit" variant="outline" size="sm" class="border-amber-700/40 bg-background/80 dark:border-amber-300/40">
      Stop impersonating
    </Button>
  </form>
</div>
