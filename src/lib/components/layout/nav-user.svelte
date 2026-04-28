<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import {
    ChevronsUpDown,
    LogOut,
    BadgeCheck,
    CreditCard,
    BrainCircuit,
  } from "@lucide/svelte";

  let {
    user,
  }: {
    user: { name: string; email: string; avatar: string };
  } = $props();
</script>

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

      <!-- Epic 4: Local AI Engine Status Inset -->
      <div
        class="mx-1 my-1.5 rounded-lg border border-border/50 bg-muted/30 p-2.5 transition-colors hover:bg-muted/50"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-semibold text-foreground"
              >Local AI Engine</span
            >
            <span
              class="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
            >
              <span class="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                ></span>
                <span
                  class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"
                ></span>
              </span>
              Gemma 8B (WebGPU)
            </span>
          </div>
          <div
            class="flex h-7 w-7 items-center justify-center rounded-md bg-background shadow-sm border border-border/40"
          >
            <BrainCircuit class="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
      </div>

      <DropdownMenu.Separator />

      <DropdownMenu.Group>
        <DropdownMenu.Item class="gap-2 rounded-md">
          <BadgeCheck class="h-4 w-4 text-muted-foreground" />
          Account Settings
        </DropdownMenu.Item>
        <DropdownMenu.Item class="gap-2 rounded-md">
          <CreditCard class="h-4 w-4 text-muted-foreground" />
          Subscription (Standard)
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
