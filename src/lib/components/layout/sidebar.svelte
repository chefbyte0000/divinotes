<script lang="ts">
  import { untrack } from "svelte";
  import { page } from "$app/state";
  import { enhance } from "$app/forms";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import type { WorkspaceNoteSummary } from "$lib/types/workspace-notes";
  import { cn } from "$lib/utils.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import NavItem from "./nav-item.svelte";
  import NavUser from "./nav-user.svelte";
  import {
    ChevronDown,
    ChevronRight,
    FolderKanban,
    Home,
    Inbox,
    LayoutGrid,
    Orbit,
    Plus,
    Users,
    FileText,
  } from "@lucide/svelte";

  let sessionUser = $derived(page.data.session?.user);
  let projects = $derived(page.data.projects ?? []);
  let workspaceNotes = $derived((page.data.workspaceNotes ?? []) as WorkspaceNoteSummary[]);

  const NOTES_CAP_PROJECT = 24;
  const NOTES_CAP_GENERAL = 24;

  function notesInProject(projectId: string) {
    return workspaceNotes
      .filter((n: WorkspaceNoteSummary) => n.projectId === projectId)
      .slice(0, NOTES_CAP_PROJECT);
  }

  function notesInGeneral() {
    return workspaceNotes
      .filter((n: WorkspaceNoteSummary) => n.projectId === null)
      .slice(0, NOTES_CAP_GENERAL);
  }

  let user = $derived({
    name: sessionUser?.name ?? "Loading...",
    email: sessionUser?.email ?? "No email found",
    avatar: sessionUser?.image ?? "",
  });

  let pathname = $derived(page.url.pathname);

  let createOpen = $state(false);
  let createProjectError = $state<string | undefined>(undefined);

  /** Project IDs whose note lists are collapsed in the sidebar */
  let collapsedProjectIds = $state(new Set<string>());

  function toggleProjectCollapsed(projectId: string) {
    const next = new Set(collapsedProjectIds);
    if (next.has(projectId)) next.delete(projectId);
    else next.add(projectId);
    collapsedProjectIds = next;
  }

  /** Expand the folder for the current project/note when route or note list updates — does not subscribe to manual collapse toggles */
  $effect(() => {
    const path = pathname;
    const notes = workspaceNotes;
    const projs = projects;

    untrack(() => {
      const next = new Set(collapsedProjectIds);
      let changed = false;
      for (const p of projs) {
        if (path === `/project/${p.id}` && next.has(p.id)) {
          next.delete(p.id);
          changed = true;
        }
      }
      const noteMatch = path.match(/^\/note\/([^/]+)/);
      if (noteMatch) {
        const note = notes.find((n) => n.id === noteMatch[1]);
        if (note?.projectId && next.has(note.projectId)) {
          next.delete(note.projectId);
          changed = true;
        }
      }
      if (changed) collapsedProjectIds = next;
    });
  });
</script>

<Sidebar.Root class="border-sidebar-border bg-sidebar text-sidebar-foreground border-r">
  <Sidebar.Header class="px-5 pb-2 pt-5">
    <div class="flex items-center gap-3">
      <div
        class="bg-sidebar-primary text-sidebar-primary-foreground ring-sidebar-border flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1"
      >
        <Orbit class="h-[1.125rem] w-[1.125rem]" />
      </div>
      <div class="flex min-w-0 flex-col gap-0.5 leading-none">
        <span class="truncate text-[15px] font-semibold tracking-tight">Divinotion</span>
        <span class="text-muted-foreground truncate text-[11px] font-normal tracking-wide">Workspace</span>
      </div>
    </div>
  </Sidebar.Header>

  <Sidebar.Content class="flex flex-col gap-8 px-4 pb-8 pt-3">
    <Sidebar.Group class="gap-3">
      <Sidebar.GroupLabel class="text-muted-foreground/70 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
        Workspace
      </Sidebar.GroupLabel>
      <Sidebar.GroupContent class="flex flex-col gap-5">
        <Sidebar.Menu class="gap-1 space-y-1">
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
          <NavItem
            icon={LayoutGrid}
            title="Projects"
            url="/projects"
            isActive={pathname === "/projects"}
          />
        </Sidebar.Menu>

        {#if sessionUser && notesInGeneral().length > 0}
          <div class="border-sidebar-border/80 bg-muted/25 rounded-xl border px-2 py-3">
            <p class="text-muted-foreground/85 mb-2.5 px-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              In General
            </p>
            <ul class="max-h-52 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5">
              {#each notesInGeneral() as n (n.id)}
                <li>
                  <a
                    href="/note/{n.id}"
                    data-sveltekit-preload-data="hover"
                    class={[
                      "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-[13px] leading-snug transition-colors",
                      pathname === `/note/${n.id}`
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground",
                    ].join(" ")}
                  >
                    <FileText class="mt-0.5 size-[14px] shrink-0 opacity-65" />
                    <span class="line-clamp-2">{n.title?.trim() ? n.title : "Untitled"}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Separator class="bg-sidebar-border/80 mx-1 h-px opacity-90" />

    <Sidebar.Group class="gap-3">
      <div class="flex items-center justify-between gap-2 px-2">
        <Sidebar.GroupLabel
          class="text-muted-foreground/70 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          Folders
        </Sidebar.GroupLabel>
        {#if sessionUser}
          <Dialog.Root bind:open={createOpen}>
            <Dialog.Trigger
              type="button"
              class={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8 shrink-0")}
            >
              <Plus class="size-4" />
              <span class="sr-only">New project</span>
            </Dialog.Trigger>
            <Dialog.Content class="sm:max-w-md">
              <Dialog.Header>
                <Dialog.Title>New project</Dialog.Title>
                <Dialog.Description>
                  A folder for notes and wiki-links — stays isolated from other projects.
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
                  <label class="text-sm font-medium leading-none" for="project-name">Name</label>
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
        <Sidebar.Menu class="space-y-3">
          {#if projects.length === 0}
            <p class="text-muted-foreground px-2 py-2 text-[13px] leading-relaxed">
              {#if sessionUser}
                No folders yet — use + to create one.
              {:else}
                Sign in to sync notes.
              {/if}
            </p>
          {:else}
            {#each projects as p (p.id)}
              {@const folderNotes = notesInProject(p.id)}
              {@const isCollapsed = collapsedProjectIds.has(p.id)}
              <div class="flex flex-col gap-2">
                <div class="flex min-w-0 items-stretch gap-0.5">
                  {#if folderNotes.length > 0}
                    <button
                      type="button"
                      class="text-muted-foreground hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground flex shrink-0 items-center justify-center rounded-lg px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                      aria-expanded={!isCollapsed}
                      aria-controls="folder-notes-{p.id}"
                      onclick={(e) => {
                        e.preventDefault();
                        toggleProjectCollapsed(p.id);
                      }}
                    >
                      {#if isCollapsed}
                        <ChevronRight class="size-4" />
                      {:else}
                        <ChevronDown class="size-4" />
                      {/if}
                      <span class="sr-only">{isCollapsed ? "Expand" : "Collapse"} notes for {p.name}</span>
                    </button>
                  {:else}
                    <span class="w-7 shrink-0" aria-hidden="true"></span>
                  {/if}
                  <div class="min-w-0 flex-1">
                    <NavItem
                      icon={FolderKanban}
                      title={p.name}
                      url={`/project/${p.id}`}
                      isActive={pathname === `/project/${p.id}`}
                    />
                  </div>
                </div>
                {#if folderNotes.length > 0 && !isCollapsed}
                  <ul
                    id="folder-notes-{p.id}"
                    class="border-sidebar-border/70 ml-3 max-h-56 space-y-0.5 overflow-y-auto overscroll-contain border-l pl-3 pr-0.5"
                  >
                    {#each folderNotes as n (n.id)}
                      <li>
                        <a
                          href="/note/{n.id}"
                          data-sveltekit-preload-data="hover"
                          class={[
                            "flex items-start gap-2.5 rounded-lg py-2 pr-1.5 text-[13px] leading-snug transition-colors",
                            pathname === `/note/${n.id}`
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-muted-foreground hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground",
                          ].join(" ")}
                        >
                          <FileText class="mt-0.5 size-[14px] shrink-0 opacity-65" />
                          <span class="line-clamp-2">{n.title?.trim() ? n.title : "Untitled"}</span>
                        </a>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/each}
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if sessionUser?.role === "admin"}
      <Sidebar.Separator class="bg-sidebar-border/80 mx-1 h-px opacity-90" />

      <Sidebar.Group class="gap-3">
        <Sidebar.GroupLabel class="text-muted-foreground/70 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
          Admin
        </Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu class="space-y-1">
            <NavItem icon={Users} title="Users" url="/admin/users" isActive={pathname.startsWith("/admin/users")} />
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}
  </Sidebar.Content>

  <Sidebar.Footer class="border-sidebar-border bg-sidebar/95 px-4 pb-5 pt-4 backdrop-blur-sm">
    <Sidebar.Menu>
      <NavUser {user} />
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>
