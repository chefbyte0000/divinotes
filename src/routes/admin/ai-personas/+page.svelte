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
  import { toast } from "$lib/toasts/toast";
  import {
    Plus,
    Pencil,
    Trash2,
    Sparkles,
    Tags,
    RefreshCw,
    UserCircle,
    FileText,
    SlidersHorizontal,
    ChevronDown,
  } from "@lucide/svelte";

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
  let strictJsonOutput = $state(false);
  let jsonOutputSpecification = $state("");

  type PersonaDialogSection = "basics" | "prompt" | "advanced";
  let personaDialogSection = $state<PersonaDialogSection>("basics");

  function configJsonWithoutStrictFields(cfg: Record<string, unknown>): Record<string, unknown> {
    const { strictJsonOutput: _a, jsonOutputSpecification: _b, ...rest } = cfg;
    return rest;
  }

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
    strictJsonOutput = false;
    jsonOutputSpecification = "";
    personaDialogSection = "basics";
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
    const cfg = (p.config ?? {}) as Record<string, unknown>;
    strictJsonOutput = Boolean(cfg.strictJsonOutput);
    jsonOutputSpecification =
      typeof cfg.jsonOutputSpecification === "string" ? cfg.jsonOutputSpecification : "";
    configJson = JSON.stringify(configJsonWithoutStrictFields(cfg), null, 2);
    personaDialogSection = "basics";
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
      <form
        method="POST"
        action={`${basePath}?/seedStarters`}
        use:enhance={() => {
          submitting = true;
          return async ({ result }) => {
            submitting = false;
            if (result.type === "success") {
              const ins = result.data?.seedInserted;
              const skip = result.data?.seedSkipped;
              if (typeof ins === "number" && typeof skip === "number") {
                if (ins > 0) {
                  toast(`Added ${ins} missing starter persona${ins === 1 ? "" : "s"}.`, { variant: "success" });
                } else {
                  toast("All starter personas are already present.", { variant: "success" });
                }
              } else {
                toast("Starter list refreshed.", { variant: "success" });
              }
              await invalidateAll();
            } else if (result.type === "failure") {
              toast("Could not sync starter personas.", { variant: "destructive" });
            }
          };
        }}
      >
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={submitting}
          title="Insert any built-in starter personas that are not in the database yet (existing slugs are unchanged)"
        >
          {#if data.personas.length === 0}
            <Sparkles class="mr-2 h-4 w-4" />
            Install starter personas
          {:else}
            <RefreshCw class="mr-2 h-4 w-4" />
            Refresh — add missing starters
          {/if}
        </Button>
      </form>
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
      Starter sync: added {form.seedInserted}, skipped {form.seedSkipped ?? 0} (slug already
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
            {#if p.config && typeof p.config === "object" && "strictJsonOutput" in p.config && p.config.strictJsonOutput}
              <Badge variant="secondary" class="font-mono text-[10px]">Strict JSON</Badge>
            {/if}
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
  <Dialog.Content
    class="flex h-[min(88dvh,820px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
  >
    <Dialog.Header class="border-border shrink-0 space-y-2 border-b px-6 pt-6 pr-14 pb-4">
      <Dialog.Title>{dialogMode === "create" ? "New persona" : "Edit persona"}</Dialog.Title>
      <Dialog.Description class="text-muted-foreground text-sm leading-relaxed">
        A <span class="text-foreground font-mono text-xs">slug</span> is the stable key your app uses; tags
        help route features to the right persona.
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
      class="flex min-h-0 flex-1 flex-col"
    >
      {#if dialogMode === "edit" && editing}
        <input type="hidden" name="id" value={editing.id} />
      {/if}

      <div
        class="border-border bg-muted/30 shrink-0 border-b px-6 py-3"
        role="tablist"
        aria-label="Persona editor sections"
      >
        <div class="bg-muted/80 flex max-w-full gap-1 rounded-lg p-1">
          <button
            type="button"
            role="tab"
            id="persona-tab-basics"
            aria-selected={personaDialogSection === "basics"}
            aria-controls="persona-panel-basics"
            tabindex={personaDialogSection === "basics" ? 0 : -1}
            class="text-muted-foreground flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium transition-colors sm:text-sm {personaDialogSection ===
            'basics'
              ? 'bg-background text-foreground ring-border shadow-sm ring-1'
              : 'hover:text-foreground'}"
            onclick={() => (personaDialogSection = "basics")}
          >
            <UserCircle class="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
            <span class="truncate">Basics</span>
          </button>
          <button
            type="button"
            role="tab"
            id="persona-tab-prompt"
            aria-selected={personaDialogSection === "prompt"}
            aria-controls="persona-panel-prompt"
            tabindex={personaDialogSection === "prompt" ? 0 : -1}
            class="text-muted-foreground flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium transition-colors sm:text-sm {personaDialogSection ===
            'prompt'
              ? 'bg-background text-foreground ring-border shadow-sm ring-1'
              : 'hover:text-foreground'}"
            onclick={() => (personaDialogSection = "prompt")}
          >
            <FileText class="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
            <span class="truncate">System prompt</span>
          </button>
          <button
            type="button"
            role="tab"
            id="persona-tab-advanced"
            aria-selected={personaDialogSection === "advanced"}
            aria-controls="persona-panel-advanced"
            tabindex={personaDialogSection === "advanced" ? 0 : -1}
            class="text-muted-foreground flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium transition-colors sm:text-sm {personaDialogSection ===
            'advanced'
              ? 'bg-background text-foreground ring-border shadow-sm ring-1'
              : 'hover:text-foreground'}"
            onclick={() => (personaDialogSection = "advanced")}
          >
            <SlidersHorizontal class="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
            <span class="truncate">Advanced</span>
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {#if form?.error}
          <p class="bg-destructive/10 text-destructive mb-4 rounded-md px-3 py-2 text-sm">{form.error}</p>
        {/if}

        {#if personaDialogSection === "basics"}
          <div
            id="persona-panel-basics"
            role="tabpanel"
            aria-labelledby="persona-tab-basics"
            class="mx-auto max-w-lg space-y-5"
          >
            <p class="text-muted-foreground text-xs leading-relaxed">
              Identity and how this persona appears in lists. Slug cannot be changed casually in code that
              references it — pick something stable.
            </p>

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
              <p class="text-muted-foreground text-[11px]">Lowercase, hyphens; used as the API key.</p>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium" for="pf-name">Display name</label>
              <Input id="pf-name" name="name" bind:value={name} required disabled={submitting} />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium" for="pf-desc">Short description</label>
              <Input
                id="pf-desc"
                name="description"
                bind:value={description}
                disabled={submitting}
                placeholder="One line for admins"
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
              <p class="text-muted-foreground text-[11px]">Comma-separated. Suggested:</p>
              <div class="flex flex-wrap gap-1.5">
                {#each AI_PERSONA_CAPABILITY_SUGGESTIONS as tag (tag)}
                  <button
                    type="button"
                    class="border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors"
                    onclick={() => appendTag(tag)}
                  >
                    +{tag}
                  </button>
                {/each}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
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
          </div>
        {:else if personaDialogSection === "prompt"}
          <div
            id="persona-panel-prompt"
            role="tabpanel"
            aria-labelledby="persona-tab-prompt"
            class="flex min-h-0 flex-col gap-3"
          >
            <p class="text-muted-foreground text-xs leading-relaxed">
              This text is sent to the model as the system message for every feature that uses this persona.
            </p>
            <div class="flex min-h-[min(50dvh,22rem)] flex-col gap-2">
              <label class="text-sm font-medium" for="pf-prompt">System prompt</label>
              <Textarea
                id="pf-prompt"
                name="systemPrompt"
                bind:value={systemPrompt}
                required
                disabled={submitting}
                class="font-mono min-h-[min(50dvh,22rem)] flex-1 resize-y text-xs leading-relaxed"
                spellcheck={false}
              />
            </div>
          </div>
        {:else}
          <div
            id="persona-panel-advanced"
            role="tabpanel"
            aria-labelledby="persona-tab-advanced"
            class="mx-auto max-w-lg space-y-6"
          >
            <p class="text-muted-foreground text-xs leading-relaxed">
              Optional output shaping and tuning JSON. Most personas only need the Basics and System prompt
              tabs.
            </p>

            <div class="border-border bg-muted/25 space-y-4 rounded-xl border p-4">
              <label class="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="strictJsonOutput"
                  bind:checked={strictJsonOutput}
                  disabled={submitting}
                  class="border-input text-primary focus-visible:ring-ring mt-0.5 size-4 shrink-0 rounded border shadow-xs"
                />
                <span>
                  <span class="text-sm font-medium">Strict JSON output</span>
                  <span class="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    When enabled, the app adds JSON-only instructions on top of your system prompt at
                    inference time.
                  </span>
                </span>
              </label>
              <div class="space-y-2 border-t border-border/60 pt-4">
                <label class="text-sm font-medium" for="pf-json-spec">Expected JSON shape</label>
                <p class="text-muted-foreground text-[11px] leading-relaxed">
                  Schema, example object, or bullet rules — whatever helps the model match your parser.
                </p>
                <Textarea
                  id="pf-json-spec"
                  name="jsonOutputSpecification"
                  bind:value={jsonOutputSpecification}
                  rows={6}
                  disabled={submitting}
                  placeholder="JSON Schema, example object, or field-by-field rules"
                  class="font-mono text-[11px] leading-relaxed"
                  spellcheck={false}
                />
              </div>
            </div>

            <details class="group border-border rounded-xl border">
              <summary
                class="text-foreground hover:bg-muted/50 flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden"
              >
                <span>Model tuning (JSON)</span>
                <ChevronDown
                  class="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div class="border-border space-y-2 border-t px-4 py-4">
                <p class="text-muted-foreground text-[11px] leading-relaxed">
                  Temperature, max tokens, etc. Do not put <code class="text-foreground text-[10px]">strictJsonOutput</code>
                  here — use the toggle above.
                </p>
                <Textarea
                  id="pf-config"
                  name="config"
                  bind:value={configJson}
                  rows={8}
                  disabled={submitting}
                  class="font-mono text-[11px] leading-relaxed"
                  spellcheck={false}
                />
              </div>
            </details>
          </div>
        {/if}
      </div>

      <Dialog.Footer
        class="border-border bg-muted/15 flex shrink-0 flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-muted-foreground order-2 text-center text-[11px] sm:order-1 sm:text-left">
          {#if personaDialogSection === "basics"}
            Next: write the
            <button
              type="button"
              class="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              onclick={() => (personaDialogSection = "prompt")}
            >
              system prompt
            </button>.
          {:else if personaDialogSection === "prompt"}
            <button
              type="button"
              class="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              onclick={() => (personaDialogSection = "basics")}
            >
              Basics
            </button>
            · optional
            <button
              type="button"
              class="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              onclick={() => (personaDialogSection = "advanced")}
            >
              Advanced
            </button>.
          {:else}
            <button
              type="button"
              class="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              onclick={() => (personaDialogSection = "prompt")}
            >
              Back to prompt
            </button>
            or
            <button
              type="button"
              class="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              onclick={() => (personaDialogSection = "basics")}
            >
              Basics
            </button>.
          {/if}
        </p>
        <div class="order-1 flex justify-end gap-2 sm:order-2">
          <Button type="button" variant="outline" onclick={() => (dialogOpen = false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : dialogMode === "create" ? "Create" : "Save changes"}
          </Button>
        </div>
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
