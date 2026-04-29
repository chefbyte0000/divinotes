<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { cn } from "$lib/utils.js";
  import { Download } from "@lucide/svelte";

  import {
    fetchProjectNotesForExport,
    stitchProjectToBlob,
    type ProjectNoteSortMode,
    type StitchedExportFormat,
  } from "$lib/export/stitch-project";
  import { triggerBlobDownload } from "$lib/export/blob-download";

  let {
    projectId,
    projectName,
    orderedNoteIds,
  }: {
    projectId: string;
    projectName: string;
    orderedNoteIds?: string[];
  } = $props();

  let open = $state(false);
  let busy = $state(false);
  let err = $state<string | null>(null);

  let format = $state<StitchedExportFormat>("markdown");
  let sort = $state<ProjectNoteSortMode>("manual");
  let includeMetadata = $state(true);
  let includeAiPreface = $state(false);

  function slug(name: string) {
    return name.trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 96) || "project";
  }

  async function runExport() {
    busy = true;
    err = null;
    try {
      const notes = await fetchProjectNotesForExport(projectId);
      const blob = await stitchProjectToBlob({
        projectName,
        notes,
        sort,
        orderedNoteIds:
          sort === "manual" ? orderedNoteIds ?? notes.map((n) => n.id) : undefined,
        includeMetadata,
        prefaceMarkdown:
          includeAiPreface
            ? "_Executive summary (local AI hook reserved — enable when Gemma stitch is wired)._"
            : undefined,
        format,
      });
      const ext = format === "markdown" ? "md" : format === "docx" ? "docx" : "pdf";
      const mime =
        format === "markdown"
          ? "text/markdown"
          : format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf";
      triggerBlobDownload(blob, {
        filename: `${slug(projectName)}-export.${ext}`,
        mimeType: mime,
      });
      open = false;
    } catch (e) {
      err = e instanceof Error ? e.message : "Export failed";
    } finally {
      busy = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger class={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
    <Download class="size-4" />
    Export project
  </Dialog.Trigger>

  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Export project</Dialog.Title>
      <Dialog.Description>
        Client-side only — note bodies stay in your browser; nothing is sent to a PDF server.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <div class="space-y-1.5">
        <label class="text-muted-foreground text-xs font-medium uppercase tracking-wide" for="fmt"
          >Format</label
        >
        <select
          id="fmt"
          class="border-input bg-background ring-offset-background h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          bind:value={format}
          disabled={busy}
        >
          <option value="markdown">Markdown (recommended)</option>
          <option value="docx">Word (.docx)</option>
          <option value="pdf">PDF (plain text layout)</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="text-muted-foreground text-xs font-medium uppercase tracking-wide" for="sort"
          >Note order</label
        >
        <select
          id="sort"
          class="border-input bg-background ring-offset-background h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          bind:value={sort}
          disabled={busy}
        >
          <option value="manual">Manual (current sidebar / page order)</option>
          <option value="alphabetical">Alphabetical by title</option>
          <option value="created">Date created</option>
        </select>
      </div>

      <label class="flex cursor-pointer items-start gap-3 py-0.5">
        <Checkbox bind:checked={includeMetadata} disabled={busy} class="mt-0.5" />
        <span class="text-sm leading-snug">
          <span class="font-medium">Include metadata</span>
          <span class="text-muted-foreground block text-xs">Tags and timestamps in the export.</span>
        </span>
      </label>

      <label class="flex cursor-pointer items-start gap-3 py-0.5 opacity-80">
        <Checkbox bind:checked={includeAiPreface} disabled={busy} class="mt-0.5" />
        <span class="text-sm leading-snug">
          <span class="font-medium">AI summary preface</span>
          <span class="text-muted-foreground block text-xs"
            >Placeholder until Gemma stitches a one-page executive summary.</span
          >
        </span>
      </label>

      {#if err}
        <p class="text-destructive text-sm">{err}</p>
      {/if}
    </div>

    <Dialog.Footer class="gap-2 sm:justify-end">
      <Button type="button" variant="outline" onclick={() => (open = false)} disabled={busy}>
        Cancel
      </Button>
      <Button type="button" disabled={busy} onclick={() => void runExport()}>
        {busy ? "Working…" : "Download"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
