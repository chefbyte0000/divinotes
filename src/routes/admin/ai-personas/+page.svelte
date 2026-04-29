<script lang="ts">
  import PageHeader from "$lib/components/layout/page-header.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { AI_PERSONA_CAPABILITY_SUGGESTIONS } from "$lib/types/ai-persona";
  import type { PageProps } from "./$types";
  import { Plus, Pencil, Trash2, Sparkles, Tags } from "@lucide/svelte";

  type PersonaRow = PageProps["data"]["personas"][number];

  let { data, form }: PageProps = $props();

  const basePath = $derived(page.url.pathname);

  let dialogOpen = $state(false);
  let dialogMode = $state<"create" | "edit">("create");
  let editing = $state<PersonaRow | null>(null);
  let submitting = $state(false);

  let deleteDialogOpen = $state(false);
  let deleteTarget = $state<PersonaRow | null>(null);

  let slug = $state("");
  let name = $state("");
  let description = $state("");
  let systemPrompt = $state("");
  let capabilityTags = $state("");
  let sortOrder = $state("0");
  /** Form select uses string values */
  let statusActive = $state<"true" | "false">("true");
  let configJson = $state("{}");

  function openCreate() {
    dialogMode = "create";
    editing = null;
    slug = "";
    name = "";
    description = "";
    systemPrompt = "";
    capabilityTags = "summarization, general";
    sortOrder = "0";
    statusActive = "true";
    configJson = "{}";
    dialogOpen = true;
  }

  function openEdit(p: PersonaRow) {
    dialogMode = "edit";
    editing = p;
    slug = p.slug;
    name = p.name;
    description = p.description ?? "";
    systemPrompt = p.systemPrompt;
    capabilityTags = (p.capabilityTags ?? []).join(", ");
    sortOrder = String(p.sortOrder);
    statusActive = p.isActive ? "true" : "false";
    configJson = JSON.stringify(p.config ?? {}, null, 2);
    dialogOpen = true;
  }

  function appendTag(tag: string) {
    const parts = capabilityTags
      .split(/[,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.includes(tag)) parts.push(tag);
    capabilityTags = parts.join(", ");
  }

  function closeDialog() {
    dialogOpen = false;
  }

  $effect(() => {
    if (!deleteDialogOpen) deleteTarget = null;
  });

  function requestDelete(p: PersonaRow) {
    deleteTarget = p;
    deleteDialogOpen = true;
  }
</script>

<div class="flex h-full min-h-0 min-w-0 flex-col">
  <PageHeader
    title="AI personas"
    subtitle="Reusable system prompts and capability tags for local AI features (summaries, recipes, and anything you add later). Each persona has a stable slug your code can load by key."
  >
    <div class="flex flex-wrap items-center gap-2">
      {#if data.personas.length === 0}
        <form
          method="POST"
          action={`${basePath}?/seedStarters`}
          use:enhance={() => {
            submitting = true;
            return async ({ result }) => {
              submitting = false;
              if (result.type === "success") await invalidateAll();
            };
          }}
        >
          <Button type="submit" variant="secondary" size="sm" disabled={submitting}>
            <Sparkles class="mr-2 h-4 w-4" />
            Install starter personas
          </Button>
        </form>
      {/if}
      <Button type="button" onclick={openCreate}>
        <Plus class="mr-2 h-4 w-4" />
        New persona
      </Button>
    </div>
  </PageHeader>

  {#if form?.error}
    <p class="bg-destructive/10 text-destructive mb-4 rounded-lg px-3 py-2 text-sm" role="alert">
      {form.error}
    </p>
  {/if}

  {#if form?.success && typeof form.seedInserted === "number"}
    <p class="border-border bg-muted/40 text-muted-foreground mb-4 rounded-lg border px-3 py-2 text-sm">
      Starter personas: added {form.seedInserted}, skipped {form.seedSkipped ?? 0} (already
      present).
    </p>
  {/if}

  {#if data.personas.length === 0}
    <div
      class="border-border bg-card/50 text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm leading-relaxed"
    >
      No personas yet. Install the starter set or create one — features like note summarization can
      resolve a persona by <span class="text-foreground font-mono text-xs">slug</span> at runtime.
    </div>
  {:else}
    <ul class="grid min-w-0 gap-4 md:grid-cols-2">
      {#each data.personas as p (p.id)}
        <li
          class="border-border bg-card ring-border/40 flex min-w-0 flex-col rounded-xl border p-5 shadow-sm ring-1"
        >
          <div class="flex min-w-0 items-start justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-base font-semibold tracking-tight">{p.name}</h2>
                {#if !p.isActive}
                  <Badge variant="secondary" class="text-[10px]">Inactive</Badge>
                {/if}
              </div>
              <p class="text-muted-foreground font-mono text-xs tracking-tight">{p.slug}</p>
            </div>
            <div class="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="icon-sm" onclick={() => openEdit(p)}>
                <Pencil class="h-4 w-4" />
                <span class="sr-only">Edit {p.name}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="text-destructive hover:text-destructive"
                onclick={() => requestDelete(p)}
              >
                <Trash2 class="h-4 w-4" />
                <span class="sr-only">Delete {p.name}</span>
              </Button>
            </div>
          </div>

          {#if p.description}
            <p class="text-muted-foreground mt-2 text-sm leading-relaxed">{p.description}</p>
          {/if}

          <div class="mt-3 flex flex-wrap gap-1.5">
            {#each p.capabilityTags ?? [] as tag (tag)}
              <Badge variant="outline" class="font-normal">{tag}</Badge>
            {/each}
          </div>

          <p class="text-muted-foreground mt-3 line-clamp-3 font-mono text-[11px] leading-snug">
            {p.systemPrompt}
          </p>

          <div class="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-[11px]">
            <span>Sort {p.sortOrder}</span>
            <span>Updated {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="max-h-[min(90vh,720px)] max-w-lg overflow-y-auto sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>{dialogMode === "create" ? "New persona" : "Edit persona"}</Dialog.Title>
      <Dialog.Description>
        Slug is the stable API key. Capability tags are free-form labels for routing (e.g. summarization,
        recipe). Advanced JSON merges into <code class="text-xs">config</code> for future options.
      </Dialog.Description>
    </Dialog.Header>

    <form
      method="POST"
      action={dialogMode === "create" ? `${basePath}?/createPersona` : `${basePath}?/updatePersona`}
      use:enhance={() => {
        submitting = true;
        return async ({ result }) => {
          submitting = false;
          if (result.type === "success") {
            await invalidateAll();
            closeDialog();
          }
        };
      }}
      class="space-y-4 py-2"
    >
      {#if dialogMode === "edit" && editing}
        <input type="hidden" name="id" value={editing.id} />
      {/if}

      {#if form?.error}
        <p class="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">{form.error}</p>
      {/if}

      <div class="space-y-2">
        <label class="text-sm font-medium" for="pf-slug">Slug</label>
        <Input
          id="pf-slug"
          name="slug"
          bind:value={slug}
          placeholder="note-summarizer"
          required
          disabled={submitting}
          autocomplete="off"
          class="font-mono text-sm"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium" for="pf-name">Display name</label>
        <Input id="pf-name" name="name" bind:value={name} required disabled={submitting} />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium" for="pf-desc">Description</label>
        <Input id="pf-desc" name="description" bind:value={description} disabled={submitting} />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium" for="pf-prompt">System prompt</label>
        <Textarea
          id="pf-prompt"
          name="systemPrompt"
          bind:value={systemPrompt}
          rows={8}
          required
          disabled={submitting}
          class="font-mono text-xs leading-relaxed"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Tags class="text-muted-foreground h-4 w-4" />
          <label class="text-sm font-medium" for="pf-tags">Capability tags</label>
        </div>
        <Input
          id="pf-tags"
          name="capabilityTags"
          bind:value={capabilityTags}
          placeholder="summarization, recipe"
          disabled={submitting}
        />
        <div class="flex flex-wrap gap-1">
          {#each AI_PERSONA_CAPABILITY_SUGGESTIONS as tag (tag)}
            <button
              type="button"
              class="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
              onclick={() => appendTag(tag)}
            >
              +{tag}
            </button>
          {/each}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <label class="text-sm font-medium" for="pf-sort">Sort order</label>
          <Input
            id="pf-sort"
            name="sortOrder"
            type="number"
            bind:value={sortOrder}
            disabled={submitting}
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium" for="pf-active">Status</label>
          <select
            id="pf-active"
            name="isActive"
            class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
            bind:value={statusActive}
            disabled={submitting}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium" for="pf-config">Config (JSON object)</label>
        <Textarea
          id="pf-config"
          name="config"
          bind:value={configJson}
          rows={5}
          disabled={submitting}
          class="font-mono text-xs leading-relaxed"
          spellcheck={false}
        />
      </div>

      <Dialog.Footer class="gap-2 sm:justify-end">
        <Button type="button" variant="outline" onclick={() => (dialogOpen = false)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : dialogMode === "create" ? "Create" : "Save changes"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete persona</Dialog.Title>
      <Dialog.Description>
        Remove <strong>{deleteTarget?.name ?? ""}</strong> ({deleteTarget?.slug ?? ""})? This cannot be
        undone.
      </Dialog.Description>
    </Dialog.Header>
    {#if deleteTarget}
      <form
        method="POST"
        action={`${basePath}?/deletePersona`}
        use:enhance={() => {
          submitting = true;
          return async ({ result }) => {
            submitting = false;
            if (result.type === "success") {
              deleteDialogOpen = false;
              await invalidateAll();
            }
          };
        }}
        class="flex justify-end gap-2 pt-2"
      >
        <input type="hidden" name="id" value={deleteTarget.id} />
        <Button type="button" variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
        <Button type="submit" variant="destructive" disabled={submitting}>Delete</Button>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
