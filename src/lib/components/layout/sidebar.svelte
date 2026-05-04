<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { onDestroy, tick, untrack } from "svelte";
  import { page } from "$app/state";
  import { enhance } from "$app/forms";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import type { WorkspaceNoteSummary } from "$lib/types/workspace-notes";
  import { cn } from "$lib/utils.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { toast } from "$lib/toasts/toast";
  import NavItem from "./nav-item.svelte";
  import NavUser from "./nav-user.svelte";
  import SidebarNoteRow from "./sidebar-note-row.svelte";
  import {
    ChevronDown,
    ChevronRight,
    FolderKanban,
    Home,
    LayoutGrid,
    ListTodo,
    Bell,
    Orbit,
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Users,
    Sparkles,
    NotepadText,
  } from "@lucide/svelte";

  const actionTriggerClass =
    "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 focus:bg-sidebar-accent/60 data-[state=open]:bg-sidebar-accent/70 size-7 shrink-0 rounded-md transition-colors";

  let sessionUser = $derived(page.data.session?.user);
  let projects = $derived(page.data.projects ?? []);
  let workspaceNotes = $derived(
    (page.data.workspaceNotes ?? []) as WorkspaceNoteSummary[],
  );

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
  let busyKey = $state<string | null>(null);
  let renameOpen = $state(false);
  let renameSubmitting = $state(false);
  let renameProjectId = $state<string | null>(null);
  let renameProjectValue = $state("");
  let editingNoteId = $state<string | null>(null);
  let editingNoteDraft = $state("");
  let noteRenameSaving = $state(false);
  let noteNavTimer: ReturnType<typeof setTimeout> | null = null;
  let noteNavPendingId: string | null = null;
  let deleteOpen = $state(false);
  let deleteSubmitting = $state(false);
  let deleteTarget = $state<{ kind: "project" | "note"; id: string; label: string } | null>(null);
  let createListOpen = $state(false);
  let createListSubmitting = $state(false);
  let createListProjectId = $state<string | null>(null);
  let createListTitle = $state("Untitled list");

  /** Project IDs whose note lists are collapsed in the sidebar */
  let collapsedProjectIds = $state(new Set<string>());

  function toggleProjectCollapsed(projectId: string) {
    const next = new Set(collapsedProjectIds);
    if (next.has(projectId)) next.delete(projectId);
    else next.add(projectId);
    collapsedProjectIds = next;
  }

  async function runSidebarMutation(key: string, run: () => Promise<void>) {
    if (busyKey) return;
    busyKey = key;
    try {
      await run();
      await invalidateAll();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : "Action failed.", {
        variant: "destructive",
      });
    } finally {
      busyKey = null;
    }
  }

  async function addNote(projectId: string | null) {
    await runSidebarMutation(
      `create-note-${projectId ?? "general"}`,
      async () => {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!response.ok) throw new Error("Could not create note");
        const data = (await response.json()) as { id: string };
        await goto(`/note/${data.id}`);
      },
    );
  }

  function addList(projectId: string | null) {
    createListProjectId = projectId;
    createListTitle = "Untitled list";
    createListOpen = true;
  }

  async function confirmCreateList() {
    const title = createListTitle.trim() || "Untitled list";
    const projectId = createListProjectId;

    createListSubmitting = true;
    try {
      const response = await fetch("/api/smart-lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, title }),
      });
      if (!response.ok) throw new Error("Could not create list.");
      const data = (await response.json()) as { id: string };
      createListOpen = false;
      await invalidateAll();
      await goto(`/list/${data.id}`);
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : "Could not create list.", {
        variant: "destructive",
      });
    } finally {
      createListSubmitting = false;
    }
  }

  function renameProject(projectId: string, currentName: string) {
    renameProjectId = projectId;
    renameProjectValue = currentName;
    renameOpen = true;
  }

  function deleteProject(projectId: string, name: string) {
    deleteTarget = { kind: "project", id: projectId, label: name };
    deleteOpen = true;
  }

  function startInlineNoteEdit(noteId: string, currentTitle: string | null) {
    if (noteNavTimer) {
      clearTimeout(noteNavTimer);
      noteNavTimer = null;
      noteNavPendingId = null;
    }
    editingNoteId = noteId;
    editingNoteDraft = currentTitle?.trim() ? currentTitle : "Untitled";
  }

  function cancelInlineNoteEdit() {
    editingNoteId = null;
    editingNoteDraft = "";
  }

  async function commitInlineNoteEdit() {
    if (!editingNoteId) return;
    const id = editingNoteId;
    const next = editingNoteDraft.trim();
    if (!next) {
      toast("Title is required.", { variant: "destructive" });
      await tick();
      document.getElementById(`sidebar-note-title-${id}`)?.focus();
      return;
    }

    const note = workspaceNotes.find((x) => x.id === id);
    const prev = note?.title?.trim() ?? "";
    if (next === prev) {
      cancelInlineNoteEdit();
      return;
    }

    noteRenameSaving = true;
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!response.ok) throw new Error("Could not rename note.");
      cancelInlineNoteEdit();
      await invalidateAll();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : "Rename failed.", {
        variant: "destructive",
      });
    } finally {
      noteRenameSaving = false;
    }
  }

  async function handleNoteTitleBlurCommit() {
    if (!editingNoteId) return;
    await commitInlineNoteEdit();
  }

  function handleSidebarNoteActivate(e: MouseEvent, noteId: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();

    if (noteNavTimer) {
      clearTimeout(noteNavTimer);
      noteNavTimer = null;
      if (noteNavPendingId === noteId) {
        noteNavPendingId = null;
        const n = workspaceNotes.find((x) => x.id === noteId);
        startInlineNoteEdit(noteId, n?.title ?? null);
        return;
      }
      const prev = noteNavPendingId;
      noteNavPendingId = null;
      if (prev) void goto(`/note/${prev}`);
    }

    noteNavPendingId = noteId;
    noteNavTimer = setTimeout(() => {
      noteNavTimer = null;
      const id = noteNavPendingId;
      noteNavPendingId = null;
      if (id) void goto(`/note/${id}`);
    }, 240);
  }

  onDestroy(() => {
    if (noteNavTimer) clearTimeout(noteNavTimer);
  });

  $effect(() => {
    if (!renameOpen) renameProjectId = null;
  });

  function deleteNote(noteId: string, title: string | null) {
    const label = title?.trim() ? title : "Untitled note";
    deleteTarget = { kind: "note", id: noteId, label };
    deleteOpen = true;
  }

  async function duplicateNote(noteId: string) {
    await runSidebarMutation(`duplicate-note-${noteId}`, async () => {
      const response = await fetch(`/api/notes/${noteId}/duplicate`, { method: "POST" });
      if (!response.ok) throw new Error("Could not duplicate note");
      const data = (await response.json()) as { id: string };
      await goto(`/note/${data.id}`);
    });
  }

  async function confirmRenameProject() {
    if (!renameProjectId) return;
    const next = renameProjectValue.trim();
    if (!next) {
      toast("Name is required.", { variant: "destructive" });
      return;
    }

    renameSubmitting = true;
    try {
      const response = await fetch(`/api/projects/${renameProjectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!response.ok) throw new Error("Could not rename project.");
      renameOpen = false;
      renameProjectId = null;
      await invalidateAll();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : "Rename failed.", {
        variant: "destructive",
      });
    } finally {
      renameSubmitting = false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    deleteSubmitting = true;
    try {
      if (deleteTarget.kind === "project") {
        const response = await fetch(`/api/projects/${deleteTarget.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Could not delete project.");
      } else {
        const response = await fetch(`/api/notes/${deleteTarget.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Could not delete note.");
      }
      deleteOpen = false;
      await invalidateAll();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : "Delete failed.", {
        variant: "destructive",
      });
    } finally {
      deleteSubmitting = false;
    }
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

<Sidebar.Root
  class="border-sidebar-border bg-sidebar text-sidebar-foreground border-r"
>
  <Sidebar.Header class="px-5 pb-2 pt-5">
    <div class="flex items-center gap-3">
      <div
        class="bg-sidebar-primary text-sidebar-primary-foreground ring-sidebar-border flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1"
      >
        <Orbit class="h-[1.125rem] w-[1.125rem]" />
      </div>
      <div class="flex min-w-0 flex-col gap-0.5 leading-none">
        <span class="truncate text-[15px] font-semibold tracking-tight"
          >Divinotion</span
        >
        <span
          class="text-muted-foreground truncate text-[11px] font-normal tracking-wide"
          >Workspace</span
        >
      </div>
    </div>
  </Sidebar.Header>

  <Sidebar.Content class="flex flex-col gap-8 px-4 pb-8 pt-3">
    <Sidebar.Group class="gap-3">
      <Sidebar.GroupLabel
        class="text-muted-foreground/70 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
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
            icon={LayoutGrid}
            title="Projects"
            url="/projects"
            isActive={pathname === "/projects"}
          />
        </Sidebar.Menu>

        {#if sessionUser && notesInGeneral().length > 0}
          <div
            class="border-sidebar-border/60 rounded-lg border border-dashed px-2 py-2.5"
          >
            <div class="mb-2 flex items-center justify-between gap-2 px-1.5">
              <p
                class="text-muted-foreground/85 text-[11px] font-semibold uppercase tracking-[0.14em]"
              >
                In General
              </p>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      class={actionTriggerClass}
                      aria-label="General actions"
                      title="General actions"
                      {...props}
                    >
                      <MoreHorizontal class="size-4" />
                    </Button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item
                    class="gap-2"
                    onclick={() => addNote(null)}
                  >
                    <NotepadText class="size-4" />
                    Add note
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    class="gap-2"
                    onclick={() => addList(null)}
                  >
                    <ListTodo class="size-4" />
                    Add list
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
            <ul
              class="max-h-52 space-y-px overflow-y-auto overscroll-contain pr-0.5"
            >
              {#each notesInGeneral() as n (n.id)}
                <SidebarNoteRow
                  note={n}
                  {pathname}
                  editing={editingNoteId === n.id}
                  draft={editingNoteDraft}
                  onDraftInput={(v) => (editingNoteDraft = v)}
                  saving={noteRenameSaving}
                  nested={false}
                  onNoteActivate={handleSidebarNoteActivate}
                  onBlurCommit={handleNoteTitleBlurCommit}
                  onCommit={() => void commitInlineNoteEdit()}
                  onCancelEdit={cancelInlineNoteEdit}
                  onDelete={() => deleteNote(n.id, n.title)}
                  onDuplicate={() => void duplicateNote(n.id)}
                  onRenameRequest={() => startInlineNoteEdit(n.id, n.title)}
                />
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
          Projects
        </Sidebar.GroupLabel>
        {#if sessionUser}
          <Dialog.Root bind:open={createOpen}>
            <Dialog.Trigger
              type="button"
              class={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "size-8 shrink-0",
              )}
            >
              <Plus class="size-4" />
              <span class="sr-only">New project</span>
            </Dialog.Trigger>
            <Dialog.Content class="sm:max-w-md">
              <Dialog.Header>
                <Dialog.Title>New project</Dialog.Title>
                <Dialog.Description>
                  A project for notes and wiki-links — stays isolated from other
                  projects.
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
                      createProjectError =
                        typeof msg === "string" ? msg : undefined;
                    }
                    if (result.type === "redirect") createOpen = false;
                  };
                }}
              >
                <div class="flex flex-col gap-2">
                  <label
                    class="text-sm font-medium leading-none"
                    for="project-name">Name</label
                  >
                  <Input
                    id="project-name"
                    name="name"
                    autocomplete="off"
                    placeholder="e.g. Research · Q2"
                    required
                  />
                </div>
                {#if createProjectError}
                  <p role="alert" class="text-destructive text-sm">
                    {createProjectError}
                  </p>
                {/if}
                <Dialog.Footer class="gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onclick={() => (createOpen = false)}
                  >
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
            <p
              class="text-muted-foreground px-2 py-2 text-[13px] leading-relaxed"
            >
              {#if sessionUser}
                No projects yet — use + to create one.
              {:else}
                Sign in to sync notes.
              {/if}
            </p>
          {:else}
            {#each projects as p (p.id)}
              {@const folderNotes = notesInProject(p.id)}
              {@const isCollapsed = collapsedProjectIds.has(p.id)}
              <div class="flex flex-col gap-2">
                <div class="group/folder flex min-w-0 items-stretch gap-0.5">
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
                      <span class="sr-only"
                        >{isCollapsed ? "Expand" : "Collapse"} notes for {p.name}</span
                      >
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
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      {#snippet child({ props })}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          class={`${actionTriggerClass} opacity-0 group-hover/folder:opacity-100 focus:opacity-100`}
                          aria-label="Project actions"
                          title="Project actions"
                          {...props}
                        >
                          <MoreHorizontal class="size-4" />
                        </Button>
                      {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item
                        class="gap-2"
                        onclick={() => addNote(p.id)}
                      >
                        <NotepadText class="size-4" />
                        Add note
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        class="gap-2"
                        onclick={() => addList(p.id)}
                      >
                        <ListTodo class="size-4" />
                        Add list
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        class="gap-2"
                        onclick={() => renameProject(p.id, p.name)}
                      >
                        <Pencil class="size-4" />
                        Rename
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        variant="destructive"
                        class="gap-2"
                        onclick={() => deleteProject(p.id, p.name)}
                      >
                        <Trash2 class="size-4" />
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
                {#if folderNotes.length > 0 && !isCollapsed}
                  <ul
                    id="folder-notes-{p.id}"
                    class="border-sidebar-border/50 ml-3 max-h-56 space-y-px overflow-y-auto overscroll-contain border-l border-dashed pl-2.5 pr-0.5"
                  >
                    {#each folderNotes as n (n.id)}
                      <SidebarNoteRow
                        note={n}
                        {pathname}
                        editing={editingNoteId === n.id}
                        draft={editingNoteDraft}
                        onDraftInput={(v) => (editingNoteDraft = v)}
                        saving={noteRenameSaving}
                        nested={true}
                        onNoteActivate={handleSidebarNoteActivate}
                        onBlurCommit={handleNoteTitleBlurCommit}
                        onCommit={() => void commitInlineNoteEdit()}
                        onCancelEdit={cancelInlineNoteEdit}
                        onDelete={() => deleteNote(n.id, n.title)}
                        onDuplicate={() => void duplicateNote(n.id)}
                        onRenameRequest={() => startInlineNoteEdit(n.id, n.title)}
                      />
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
        <Sidebar.GroupLabel
          class="text-muted-foreground/70 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          Admin
        </Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu class="space-y-1">
            <NavItem
              icon={Users}
              title="Users"
              url="/admin/users"
              isActive={pathname.startsWith("/admin/users")}
            />
            <NavItem
              icon={Sparkles}
              title="AI personas"
              url="/admin/ai-personas"
              isActive={pathname.startsWith("/admin/ai-personas")}
            />
            <NavItem
              icon={Bell}
              title="Notifications"
              url="/admin/notifications"
              isActive={pathname.startsWith("/admin/notifications")}
            />
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}
  </Sidebar.Content>

  <Sidebar.Footer
    class="border-sidebar-border bg-sidebar/95 px-4 pb-5 pt-4 backdrop-blur-sm"
  >
    <Sidebar.Menu>
      <NavUser {user} />
    </Sidebar.Menu>
  </Sidebar.Footer>

  <Dialog.Root bind:open={renameOpen}>
    <Dialog.Content class="sm:max-w-md" showCloseButton={!renameSubmitting}>
      <Dialog.Header>
        <Dialog.Title>Rename project</Dialog.Title>
      </Dialog.Header>
      <div class="flex flex-col gap-2 pt-1">
        <label class="text-sm font-medium leading-none" for="rename-item-name">
          Name
        </label>
        <Input
          id="rename-item-name"
          bind:value={renameProjectValue}
          placeholder="Project name"
          autocomplete="off"
          disabled={renameSubmitting}
        />
      </div>
      <Dialog.Footer class="gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onclick={() => (renameOpen = false)}
          disabled={renameSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onclick={() => void confirmRenameProject()}
          disabled={renameSubmitting}
        >
          {renameSubmitting ? "Saving..." : "Save"}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <Dialog.Root bind:open={deleteOpen}>
    <Dialog.Content class="sm:max-w-md" showCloseButton={!deleteSubmitting}>
      <Dialog.Header>
        <Dialog.Title
          >Delete {deleteTarget?.kind === "project" ? "project" : "note"}?</Dialog.Title
        >
        <Dialog.Description>
          <span class="text-foreground font-medium">"{deleteTarget?.label ?? ""}"</span>
          {#if deleteTarget?.kind === "project"}
            will be removed. Notes and lists in it will move to General.
          {:else}
            will be permanently removed.
          {/if}
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onclick={() => (deleteOpen = false)}
          disabled={deleteSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onclick={() => void confirmDelete()}
          disabled={deleteSubmitting}
        >
          {deleteSubmitting ? "Deleting..." : "Delete"}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <Dialog.Root bind:open={createListOpen}>
    <Dialog.Content class="sm:max-w-md" showCloseButton={!createListSubmitting}>
      <Dialog.Header>
        <Dialog.Title>Add list</Dialog.Title>
        <Dialog.Description>
          Create a list in {createListProjectId ? "this project" : "General"}.
        </Dialog.Description>
      </Dialog.Header>
      <div class="flex flex-col gap-2 pt-1">
        <label class="text-sm font-medium leading-none" for="new-list-name">Name</label>
        <Input
          id="new-list-name"
          bind:value={createListTitle}
          placeholder="Untitled list"
          autocomplete="off"
          disabled={createListSubmitting}
        />
      </div>
      <Dialog.Footer class="gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onclick={() => (createListOpen = false)}
          disabled={createListSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onclick={() => void confirmCreateList()}
          disabled={createListSubmitting}
        >
          {createListSubmitting ? "Creating..." : "Create"}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</Sidebar.Root>
