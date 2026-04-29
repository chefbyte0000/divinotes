<script lang="ts">
  import type { InitProgressReport } from "@mlc-ai/web-llm";
  import { invalidateAll } from "$app/navigation";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import { detectWebGpu } from "$lib/ai/webgpu-detector";
  import {
    applyOrganizePatches,
    buildOrganizePatches,
    generateWorkspaceOrganizePlan,
    type OrganizePlan,
    type OrganizeNotePatch,
  } from "$lib/ai/workspace-organize-ai";
  import { normalizeKanbanStatus } from "$lib/project/kanban-status";
  import type { ProjectNoteRow } from "$lib/types/project-notes";
  import { toast } from "$lib/toasts/toast";
  import { Layers, LoaderCircle } from "@lucide/svelte";

  let {
    projectId,
    projectName,
    notes,
    hideTrigger = false,
    open = $bindable(false),
  }: {
    projectId: string;
    projectName: string;
    notes: ProjectNoteRow[];
    /** When true, no outline trigger — parent opens the dialog via `bind:open`. */
    hideTrigger?: boolean;
    open?: boolean;
  } = $props();
  let phase = $state<"idle" | "running" | "preview" | "apply" | "error">("idle");
  let errorMessage = $state<string | null>(null);
  let modelHint = $state("");
  let plan = $state<OrganizePlan | null>(null);
  let patches = $state<OrganizeNotePatch[]>([]);
  let truncatedHint = $state(false);
  let abort: AbortController | null = null;

  function titleOf(row: ProjectNoteRow) {
    return row.title?.trim() ? row.title : "Untitled note";
  }

  function reset() {
    phase = "idle";
    errorMessage = null;
    modelHint = "";
    plan = null;
    patches = [];
    truncatedHint = false;
    abort?.abort();
    abort = null;
  }

  $effect(() => {
    if (!open) {
      abort?.abort();
      reset();
    }
  });

  const changeCount = $derived(patches.filter((p) => p.hasChanges).length);

  async function analyze() {
    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    errorMessage = null;
    plan = null;
    patches = [];
    phase = "running";
    modelHint = "";

    const gpu = await detectWebGpu();
    if (!gpu.ok) {
      phase = "error";
      errorMessage = `${gpu.title}: ${gpu.description}`;
      return;
    }

    const onModelProgress = (r: InitProgressReport) => {
      const t = typeof (r as { text?: unknown }).text === "string" ? (r as { text: string }).text : "";
      if (t) modelHint = t;
    };

    try {
      const { plan: nextPlan, ctx } = await generateWorkspaceOrganizePlan({
        projectId,
        signal,
        onModelProgress,
      });
      if (signal.aborted) return;
      plan = nextPlan;
      truncatedHint = ctx.truncated;
      patches = buildOrganizePatches(notes, nextPlan.assignments);
      phase = "preview";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        phase = "idle";
        return;
      }
      phase = "error";
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  }

  async function applyChanges() {
    if (!plan || patches.length === 0) return;
    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    phase = "apply";
    errorMessage = null;

    try {
      await applyOrganizePatches(patches, signal);
      if (signal.aborted) return;
      await invalidateAll();
      toast("Project notes updated from the AI plan.", { variant: "success" });
      open = false;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        phase = "preview";
        return;
      }
      phase = "error";
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<Dialog.Root bind:open>
  {#if !hideTrigger}
    <Dialog.Trigger
      type="button"
      class={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-2",
        notes.length === 0 && "pointer-events-none opacity-40",
      )}
      disabled={notes.length === 0}
      title={notes.length === 0 ? "Add notes to use AI organize" : "Reorganize notes with local AI"}
    >
      <Layers class="size-4" />
      AI organize
    </Dialog.Trigger>
  {/if}

  <Dialog.Content class="flex max-h-[min(92vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
    <Dialog.Header class="border-border shrink-0 space-y-1 border-b px-6 py-4">
      <Dialog.Title class="flex items-center gap-2 text-base">
        <Layers class="text-primary size-4" />
        Organize project notes
      </Dialog.Title>
      <Dialog.Description class="text-xs leading-relaxed">
        Uses the <span class="font-mono text-[11px]">workspace-note-organizer</span> persona and your
        preferred model from Settings → Local AI. Only notes in
        <span class="font-medium">{projectName}</span> are analyzed — nothing leaves your device except
        normal note sync after you apply.
      </Dialog.Description>
    </Dialog.Header>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
      {#if truncatedHint}
        <p class="text-muted-foreground border-border bg-muted/25 rounded-lg border px-3 py-2 text-xs leading-relaxed">
          The model only saw the most recently updated notes (per server cap). Split huge projects or run
          again after archiving if you need full coverage.
        </p>
      {/if}

      {#if phase === "idle" || phase === "error"}
        <p class="text-muted-foreground text-sm leading-relaxed">
          The organizer reads titles, descriptions, tags, and short body excerpts, then proposes kanban
          columns, priorities, tags, and a reading order (
          <span class="font-mono text-[11px]">sortRank</span>) you can apply in one pass.
        </p>
      {/if}

      {#if phase === "running"}
        <p class="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircle class="size-4 shrink-0 animate-spin" />
          {modelHint || "Running local model…"}
        </p>
      {:else if phase === "apply"}
        <p class="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircle class="size-4 shrink-0 animate-spin" />
          Applying updates to notes…
        </p>
      {:else if phase === "error" && errorMessage}
        <p class="text-destructive text-sm leading-relaxed" role="alert">{errorMessage}</p>
      {:else if phase === "preview" && plan}
        <div class="space-y-2">
          <h3 class="text-sm font-medium">Plan</h3>
          <p class="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{plan.summary}</p>
        </div>

        {#if plan.themes.length > 0}
          <div class="space-y-2">
            <h3 class="text-sm font-medium">Themes</h3>
            <ul class="space-y-2 text-sm">
              {#each plan.themes as th, ti (`${th.title}-${ti}`)}
                <li class="border-border bg-muted/20 rounded-lg border px-3 py-2">
                  <span class="font-medium">{th.title}</span>
                  <span class="text-muted-foreground mt-1 block text-xs">
                    {th.noteIds.length}
                    {th.noteIds.length === 1 ? "note" : "notes"}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="space-y-2">
          <h3 class="text-sm font-medium">Changes to write</h3>
          {#if changeCount === 0}
            <p class="text-muted-foreground text-sm leading-relaxed">
              The plan matches your current metadata on disk — nothing to patch. You can still skim the
              summary above, or close and try again after editing notes.
            </p>
          {:else}
            <p class="text-muted-foreground text-xs">
              {changeCount} {changeCount === 1 ? "note" : "notes"} will be updated via the notes API.
            </p>
            <div class="border-border max-h-[min(40vh,280px)] overflow-auto rounded-lg border">
              <table class="w-full text-left text-xs">
                <thead class="bg-muted/40 border-border sticky top-0 border-b">
                  <tr>
                    <th class="px-2 py-2 font-medium">Note</th>
                    <th class="px-2 py-2 font-medium">Updates</th>
                  </tr>
                </thead>
                <tbody>
                  {#each patches.filter((p) => p.hasChanges) as p (p.noteId)}
                    {@const row = notes.find((n) => n.id === p.noteId)}
                    {@const asg = plan.assignments.find((a) => a.noteId === p.noteId)}
                    <tr class="border-border border-b last:border-0">
                      <td class="max-w-[140px] px-2 py-2 align-top">
                        <span class="line-clamp-3">{row ? titleOf(row) : p.noteId}</span>
                      </td>
                      <td class="px-2 py-2 align-top text-muted-foreground">
                        {#if asg}
                          <div class="space-y-1">
                            {#if p.metadata.status}
                              <div>
                                Status → <span class="text-foreground font-medium">{asg.status}</span>
                                {#if row}
                                  <span class="opacity-70">
                                    (was {normalizeKanbanStatus(row.metadata?.status)})</span>
                                {/if}
                              </div>
                            {/if}
                            {#if p.metadata.priority != null}
                              <div>Priority → <span class="text-foreground font-medium">{asg.priority}</span></div>
                            {/if}
                            {#if p.metadata.sortRank != null}
                              <div>
                                Order → <span class="text-foreground font-medium">#{asg.sortRank}</span>
                              </div>
                            {/if}
                            {#if p.metadata.tags}
                              <div class="break-words">
                                Tags → <span class="text-foreground font-medium">{asg.tags.join(", ")}</span>
                              </div>
                            {/if}
                          </div>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <Dialog.Footer class="border-border bg-muted/20 flex shrink-0 flex-wrap gap-2 border-t px-6 py-3">
      <Button type="button" variant="outline" onclick={() => (open = false)}>Close</Button>
      {#if phase === "idle" || phase === "error"}
        <Button type="button" onclick={() => void analyze()} disabled={notes.length === 0}>
          Analyze project
        </Button>
      {:else if phase === "preview"}
        <Button type="button" variant="secondary" onclick={() => void analyze()}>Regenerate</Button>
        <Button type="button" onclick={() => void applyChanges()} disabled={changeCount === 0}>
          Apply {changeCount} {changeCount === 1 ? "change" : "changes"}
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
