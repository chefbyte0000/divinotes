<script lang="ts">
  import { page } from "$app/state";
  import { enhance } from "$app/forms";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import NavItem from "./nav-item.svelte";
  import NavUser from "./nav-user.svelte";
  import {
    BrainCircuit,
    FolderKanban,
    Home,
    Inbox,
    Orbit,
    ActivitySquare,
    Plus,
    ShieldCheck,
    Users,
    Database,
    Settings,
  } from "@lucide/svelte";

  let sessionUser = $derived(page.data.session?.user);
  let projects = $derived(page.data.projects ?? []);

  let user = $derived({
    name: sessionUser?.name ?? "Loading...",
    email: sessionUser?.email ?? "No email found",
    avatar: sessionUser?.image ?? "",
  });

  let pathname = $derived(page.url.pathname);

  let createOpen = $state(false);
  let createProjectError = $state<string | undefined>(undefined);

  const toolItems = [
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

<Sidebar.Root class="border-border bg-sidebar text-sidebar-foreground border-r">
  <Sidebar.Header class="p-4">
    <div class="flex items-center gap-3 font-bold tracking-tight">
      <div
        class="bg-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
      >
        <Orbit class="text-primary-foreground h-5 w-5 animate-[spin_12s_linear_infinite]" />
      </div>
      <span class="truncate text-lg">Divinotion</span>
    </div>
  </Sidebar.Header>

  <Sidebar.Content class="px-3 pb-4">
    <Sidebar.Group>
      <Sidebar.GroupLabel
        class="text-muted-foreground/60 mb-2 px-2 text-[10px] font-bold uppercase tracking-wider"
      >
        Workspace
      </Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="space-y-0.5">
          <NavItem
            icon={Home}
            title="General"
            url="/"
            isActive={pathname === "/"}
          />
          <NavItem
            icon={Inbox}
            title="Inbox"
            url="/inbox"
            isActive={pathname === "/inbox"}
          />
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Separator class="mx-3 my-4 opacity-40" />

    <Sidebar.Group>
      <div class="mb-2 flex items-center justify-between gap-2 px-2">
        <Sidebar.GroupLabel
          class="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-wider"
        >
          Projects
        </Sidebar.GroupLabel>
        {#if sessionUser}
          <Dialog.Root bind:open={createOpen}>
            <Dialog.Trigger
              type="button"
              class={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-7 shrink-0")}
            >
              <Plus class="size-4" />
              <span class="sr-only">Create project</span>
            </Dialog.Trigger>
            <Dialog.Content class="sm:max-w-md">
              <Dialog.Header>
                <Dialog.Title>New project</Dialog.Title>
                <Dialog.Description>
                  A strict folder — notes and links stay inside until you move them.
                </Dialog.Description>
              </Dialog.Header>
              <form
                method="POST"
                action="/projects?/createProject"
                class="flex flex-col gap-4 pt-2"
                use:enhance={() => {
                  return async ({ result }) => {
                    createProjectError = undefined;
                    if (result.type === "failure") {
                      createOpen = true;
                      const msg = result.data?.createProjectError;
                      createProjectError = typeof msg === "string" ? msg : undefined;
                    }
                    if (result.type === "redirect") createOpen = false;
                  };
                }}
              >
                <div class="flex flex-col gap-2">
                  <label class="text-sm leading-none font-medium" for="project-name">Name</label>
                  <Input
                    id="project-name"
                    name="name"
                    autocomplete="off"
                    placeholder="e.g. Research · Q2"
                    required
                  />
                </div>
                {#if createProjectError}
                  <p role="alert" class="text-destructive text-sm">{createProjectError}</p>
                {/if}
                <Dialog.Footer class="gap-2 sm:justify-end">
                  <Button type="button" variant="outline" onclick={() => (createOpen = false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </Dialog.Footer>
              </form>
            </Dialog.Content>
          </Dialog.Root>
        {/if}
      </div>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="space-y-0.5">
          {#if projects.length === 0}
            <li class="text-muted-foreground px-2 py-2 text-xs leading-relaxed">
              {#if sessionUser}
                No projects yet — tap + to add one.
              {:else}
                Sign in to manage projects.
              {/if}
            </li>
          {:else}
            {#each projects as p (p.id)}
              <NavItem
                icon={FolderKanban}
                title={p.name}
                url={`/project/${p.id}`}
                isActive={pathname === `/project/${p.id}`}
              />
            {/each}
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Separator class="mx-3 my-4 opacity-40" />

    <Sidebar.Group>
      <Sidebar.GroupLabel
        class="text-muted-foreground/60 mb-2 px-2 text-[10px] font-bold uppercase tracking-wider"
      >
        Tools
      </Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="space-y-0.5">
          {#each toolItems as item}
            <NavItem
              icon={item.icon}
              title={item.title}
              url={item.url}
              isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
            />
          {/each}
          <NavItem
            icon={FolderKanban}
            title="All projects"
            url="/projects"
            isActive={pathname === "/projects"}
          />
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if sessionUser?.role === "admin"}
      <Sidebar.Separator class="mx-3 my-4 opacity-40" />

      <Sidebar.Group>
        <Sidebar.GroupLabel
          class="text-muted-foreground/60 mb-2 px-2 text-[10px] font-bold uppercase tracking-wider"
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
