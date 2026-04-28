<script lang="ts">
  import { applyAction, deserialize } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { cn } from "$lib/utils.js";
  import { Check, ChevronDown } from "@lucide/svelte";

  let {
    userId,
    currentRole,
    locked = false,
  }: {
    userId: string;
    currentRole: "admin" | "premium" | "standard";
    locked?: boolean;
  } = $props();

  const roles = [
    { value: "admin" as const, label: "admin" },
    { value: "premium" as const, label: "premium" },
    { value: "standard" as const, label: "standard" },
  ];

  let loading = $state(false);

  const roleBadgeClass: Record<typeof currentRole, string> = {
    admin:
      "border-red-500/40 bg-red-500/12 text-red-800 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-300",
    premium:
      "border-violet-500/40 bg-violet-500/12 text-violet-900 dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-200",
    standard:
      "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/12 dark:text-slate-300",
  };

  async function selectRole(next: typeof currentRole) {
    if (next === currentRole || loading || locked) return;
    loading = true;
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("role", next);
      const res = await fetch(`${$page.url.pathname}?/updateRole`, {
        method: "POST",
        body: fd,
      });
      const result = deserialize(await res.text());
      await applyAction(result);
      if (result.type === "success") await invalidateAll();
    } finally {
      loading = false;
    }
  }
</script>

{#if locked}
  <Badge
    variant="outline"
    title="You cannot change your own role."
    class={cn(
      "pointer-events-none border font-medium lowercase opacity-90",
      roleBadgeClass[currentRole],
    )}
  >
    {currentRole}
  </Badge>
{:else}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          class={cn(
            "h-8 gap-1.5 border-dashed px-2 font-medium shadow-none",
            loading && "opacity-70",
          )}
          aria-label="Change role"
        >
          <Badge
            variant="outline"
            class={cn(
              "pointer-events-none border font-medium lowercase",
              roleBadgeClass[currentRole],
            )}
          >
            {currentRole}
          </Badge>
          <ChevronDown class="text-muted-foreground size-3.5 shrink-0 opacity-70" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="start" class="w-44">
      <DropdownMenu.Label class="text-xs lowercase">role</DropdownMenu.Label>
      <DropdownMenu.Separator />
      {#each roles as r (r.value)}
        <DropdownMenu.Item
          class="gap-2 lowercase"
          disabled={loading || r.value === currentRole}
          onSelect={() => {
            void selectRole(r.value);
          }}
        >
          <span>{r.label}</span>
          {#if r.value === currentRole}
            <Check class="text-muted-foreground ml-auto size-4" />
          {/if}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
