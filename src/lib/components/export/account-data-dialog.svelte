<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import { Archive, ShieldAlert } from "@lucide/svelte";

  import { buildFullAccountZipBlob, type ArchiveProgress } from "$lib/export/full-account-archive";
  import { triggerBlobDownload } from "$lib/export/blob-download";
  import { clearAllDivinotesLocalData } from "$lib/export/clear-local-data";

  let {
    open = $bindable(false),
    hideTrigger = false,
  }: {
    open?: boolean;
    hideTrigger?: boolean;
  } = $props();
  let eraseOpen = $state(false);
  let archiving = $state(false);
  let erasing = $state(false);
  let archiveErr = $state<string | null>(null);
  let eraseErr = $state<string | null>(null);
  let progress = $state<ArchiveProgress | null>(null);

  async function downloadArchive() {
    archiving = true;
    archiveErr = null;
    progress = null;
    try {
      const blob = await buildFullAccountZipBlob((p) => {
        progress = p;
      });
      const stamp = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(blob, {
        filename: `divinotes-archive-${stamp}.zip`,
        mimeType: "application/zip",
      });
      open = false;
    } catch (e) {
      archiveErr = e instanceof Error ? e.message : "Archive failed";
    } finally {
      archiving = false;
      progress = null;
    }
  }

  async function eraseEverything() {
    erasing = true;
    eraseErr = null;
    try {
      await clearAllDivinotesLocalData();
      const r = await fetch("/api/account", { method: "DELETE" });
      if (!r.ok) throw new Error(`Remote delete failed (${r.status})`);
      eraseOpen = false;
      open = false;
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/auth/signout";
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      eraseErr = e instanceof Error ? e.message : "Erasure failed";
    } finally {
      erasing = false;
    }
  }
</script>

<Dialog.Root bind:open>
  {#if !hideTrigger}
    <Dialog.Trigger
      class={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 px-2 text-xs")}
    >
      <Archive class="size-3.5" />
      Data & privacy
    </Dialog.Trigger>
  {/if}

  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Your data</Dialog.Title>
      <Dialog.Description>
        Portable ZIP with synced tables plus device-local habits. Everything stays client-side until you
        choose remote deletion.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <div class="rounded-lg border border-border/80 bg-muted/20 p-3">
        <p class="text-sm font-medium">Full archive</p>
        <p class="text-muted-foreground mt-1 text-xs leading-relaxed">
          JSON snapshot + local telemetry / habit ledger (never synced). Large vaults stream progress while
          compressing.
        </p>
        {#if progress && archiving}
          <div class="mt-3 space-y-1">
            <div class="text-muted-foreground text-[11px] tabular-nums">{progress.message}</div>
            {#if progress.phase === "compress"}
              <div class="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  class="bg-primary h-2 rounded-full transition-[width] duration-150"
                  style={`width: ${Math.min(100, Math.max(0, progress.currentFile))}%`}
                ></div>
              </div>
            {/if}
          </div>
        {/if}
        {#if archiveErr}
          <p class="text-destructive mt-2 text-xs">{archiveErr}</p>
        {/if}
        <Button
          type="button"
          class="mt-3"
          size="sm"
          disabled={archiving}
          onclick={() => void downloadArchive()}
        >
          {archiving ? "Building…" : "Download ZIP"}
        </Button>
      </div>

      <div class="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
        <div class="flex items-start gap-2">
          <ShieldAlert class="text-destructive mt-0.5 size-4 shrink-0" />
          <div>
            <p class="text-sm font-medium text-destructive">Erase local & remote</p>
            <p class="text-muted-foreground mt-1 text-xs leading-relaxed">
              Clears IndexedDB / caches on this device and deletes your Divinotes account on the server.
              Irreversible.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          class="mt-3"
          disabled={erasing}
          onclick={() => {
            eraseErr = null;
            eraseOpen = true;
          }}
        >
          Erase data…
        </Button>
      </div>
    </div>

    <Dialog.Footer>
      <Button type="button" variant="outline" onclick={() => (open = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={eraseOpen}>
  <Dialog.Content class="sm:max-w-sm" showCloseButton={!erasing}>
    <Dialog.Header>
      <Dialog.Title>Delete everything?</Dialog.Title>
      <Dialog.Description>
        Local-first stores and your cloud account will be removed. You will be signed out.
      </Dialog.Description>
    </Dialog.Header>
    {#if eraseErr}
      <p class="text-destructive text-sm">{eraseErr}</p>
    {/if}
    <Dialog.Footer class="gap-2 sm:justify-end">
      <Button type="button" variant="outline" onclick={() => (eraseOpen = false)} disabled={erasing}>
        Cancel
      </Button>
      <Button type="button" variant="destructive" disabled={erasing} onclick={() => void eraseEverything()}>
        {erasing ? "Erasing…" : "Confirm erase"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
