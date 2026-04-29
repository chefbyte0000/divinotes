<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AccountDataDialog from "$lib/components/export/account-data-dialog.svelte";
  import { goto } from "$app/navigation";
  import { Archive, BrainCircuit, ChevronsUpDown, LogOut, Settings } from "@lucide/svelte";

  let {
    user,
  }: {
    user: { name: string; email: string; avatar: string };
  } = $props();

  let accountDataOpen = $state(false);
</script>

<AccountDataDialog bind:open={accountDataOpen} hideTrigger />

<Sidebar.MenuItem>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <!-- 
					The Trigger button: Compact, matches the sidebar hover states, 
					and expands cleanly. 
				-->
        <Sidebar.MenuButton
          size="lg"
          class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          {...props}
        >
          <Avatar.Root class="h-8 w-8 rounded-lg">
            <Avatar.Image src={user.avatar} alt={user.name} />
            <Avatar.Fallback class="rounded-lg bg-primary/10 text-primary">
              {user.name.substring(0, 2).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">{user.name}</span>
            <span class="truncate text-xs text-muted-foreground"
              >{user.email}</span
            >
          </div>
          <ChevronsUpDown class="ml-auto h-4 w-4 text-muted-foreground" />
        </Sidebar.MenuButton>
      {/snippet}
    </DropdownMenu.Trigger>

    <DropdownMenu.Content
      class="w-[--bits-dropdown-menu-anchor-width] min-w-64 rounded-xl"
      side="right"
      align="end"
      sideOffset={4}
    >
      <DropdownMenu.Label class="p-0 font-normal">
        <div class="flex items-center gap-3 px-2 py-2 text-left text-sm">
          <Avatar.Root class="h-8 w-8 rounded-lg">
            <Avatar.Image src={user.avatar} alt={user.name} />
            <Avatar.Fallback class="rounded-lg bg-primary/10 text-primary">
              {user.name.substring(0, 2).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">{user.name}</span>
            <span class="truncate text-xs text-muted-foreground"
              >{user.email}</span
            >
          </div>
        </div>
      </DropdownMenu.Label>

      <DropdownMenu.Separator />

      <DropdownMenu.Group>
        <DropdownMenu.Item class="gap-2 rounded-md" onclick={() => goto("/settings?tab=local-ai")}>
          <BrainCircuit class="h-4 w-4 text-muted-foreground" />
          Local AI
        </DropdownMenu.Item>
        <DropdownMenu.Item class="gap-2 rounded-md" onclick={() => (accountDataOpen = true)}>
          <Archive class="h-4 w-4 text-muted-foreground" />
          Data & privacy
        </DropdownMenu.Item>
        <DropdownMenu.Item class="gap-2 rounded-md" onclick={() => goto("/settings")}>
          <Settings class="h-4 w-4 text-muted-foreground" />
          Settings
        </DropdownMenu.Item>
      </DropdownMenu.Group>

      <DropdownMenu.Separator />

      <form action="/auth/signout" method="POST">
        <button type="submit" class="w-full">
          <DropdownMenu.Item
            class="gap-2 rounded-md text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut class="h-4 w-4" />
            Log out
          </DropdownMenu.Item>
        </button>
      </form>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</Sidebar.MenuItem>
