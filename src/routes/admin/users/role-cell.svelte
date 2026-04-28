<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { ChevronDown } from "@lucide/svelte";
  import { enhance } from "$app/forms";

  let {
    userId,
    currentRole,
  }: {
    userId: string;
    currentRole: "admin" | "premium" | "standard";
  } = $props();

  const roles = ["admin", "premium", "standard"] as const;
  let loading = $state(false);

  const roleColors: Record<typeof currentRole, string> = {
    admin: "default",
    premium: "secondary",
    standard: "outline",
  };
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        class="gap-1 h-8 px-2"
        disabled={loading}
      >
        <Badge variant={roleColors[currentRole]} class="capitalize text-xs">
          {currentRole}
        </Badge>
        <ChevronDown class="h-3 w-3" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-[160px]">
    <DropdownMenu.Label>Change Role</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#each roles as role}
      <form
        method="POST"
        action="?/updateRole"
        use:enhance={() => {
          loading = true;
          return async () => {
            loading = false;
          };
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="role" value={role} />
        <DropdownMenu.Item
          class={currentRole === role ? "bg-accent" : ""}
          disabled={loading}
          onclick={(e) => {
            if (currentRole !== role) {
              e.currentTarget.closest("form")?.requestSubmit();
            }
          }}
        >
          <span class="capitalize">{role}</span>
          {#if currentRole === role}
            <span class="ml-auto text-xs">✓</span>
          {/if}
        </DropdownMenu.Item>
      </form>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
