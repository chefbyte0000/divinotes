<script lang="ts">
  import DeleteNoteDialog from "$lib/components/editor/delete-note-dialog.svelte";
  import type { ProjectNoteRow } from "$lib/types/project-notes";

  let { note }: { note: ProjectNoteRow } = $props();
</script>

<div class="flex justify-end pe-1">
  <DeleteNoteDialog
    noteId={note.id}
    noteTitle={note.title ?? ""}
    variant="icon"
  />
</div>
