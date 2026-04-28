<script lang="ts">
  import { page } from "$app/stores";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import NavItem from "./nav-item.svelte";
  import NavUser from "./nav-user.svelte"; // Import the new component
  import {
    Home,
    FolderGit2,
    BrainCircuit,
    Settings,
    Orbit,
    ActivitySquare,
    ShieldCheck,
    Users,
    Database,
  } from "@lucide/svelte";

  let sessionUser = $derived($page.data.session?.user);
  let user = $derived({
    name: sessionUser?.name ?? "Loading...",
    email: sessionUser?.email ?? "No email found",
    avatar: sessionUser?.image ?? "",
  });

  const workspaceItems = [
    { title: "General Workspace", url: "/", icon: Home },
    { title: "Projects", url: "/projects", icon: FolderGit2 },
    { title: "Local AI Engine", url: "/ai", icon: BrainCircuit },
    { title: "Habit Telemetry", url: "/telemetry", icon: ActivitySquare },
  ];

  const adminItems = [
    { title: "Access Control", url: "/admin/roles", icon: ShieldCheck },
    { title: "User Directory", url: "/admin/users", icon: Users },
    { title: "System Logs", url: "/admin/logs", icon: Database },
    { title: "Settings", url: "/settings", icon: Settings },
  ];
</script>

<Sidebar.Root class="border-r border-border bg-sidebar text-sidebar-foreground">
  <Sidebar.Header class="p-4">
    <div class="p-4 text-xs bg-muted/50 border-b break-all">
      <strong>Debug Role:</strong>
      {sessionUser?.role ?? "undefined"}
    </div>
    <div class="flex items-center gap-3 font-bold tracking-tight">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm"
      >
        <Orbit
          class="h-5 w-5 text-primary-foreground animate-[spin_12s_linear_infinite]"
        />
      </div>
      <span class="truncate text-lg">Divinotion</span>
    </div>
  </Sidebar.Header>

  <Sidebar.Content class="px-3 pb-4">
    <Sidebar.Group>
      <Sidebar.GroupLabel
        class="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60"
      >
        Workspace
      </Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="space-y-0.5">
          {#each workspaceItems as item}
            <NavItem icon={item.icon} title={item.title} url={item.url} />
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Separator class="mx-3 my-4 opacity-40" />

    {#if sessionUser?.role === "admin"}
      <Sidebar.Separator class="mx-3 my-4 opacity-40" />

      <Sidebar.Group>
        <Sidebar.GroupLabel
          class="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60"
        >
          Administration
        </Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu class="space-y-0.5">
            {#each adminItems as item}
              <NavItem icon={item.icon} title={item.title} url={item.url} />
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}
  </Sidebar.Content>

  <Sidebar.Footer class="p-3">
    <Sidebar.Menu>
      <NavUser {user} />
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>
