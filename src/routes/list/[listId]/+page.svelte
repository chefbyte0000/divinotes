<script lang="ts">
  import SmartListWorkspace from "$lib/components/smart-list/smart-list-workspace.svelte";
  import DeleteSmartListDialog from "$lib/components/smart-list/delete-smart-list-dialog.svelte";

  let { data } = $props();

  let workspaceLabel = $derived(
    data.list.projectId == null ? "General · Smart list" : "Project · Smart list",
  );

  let afterDeleteHref = $derived(
    data.list.projectId == null ? "/lists" : `/project/${data.list.projectId}`,
  );
</script>

<svelte:head>
  <title>{data.list.title?.trim() || "Untitled list"} · Divinotes</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-[min(96rem,calc(100vw-2rem))] flex-col gap-6 pb-16 pt-2">
  <div class="flex flex-wrap items-start justify-end gap-3 px-1">
    <DeleteSmartListDialog
      listId={data.list.id}
      listTitle={data.list.title ?? ""}
      redirectHref={afterDeleteHref}
    />
  </div>

  <SmartListWorkspace
    listId={data.list.id}
    initialTitle={data.list.title ?? ""}
    initialDescription={data.list.description}
    initialItems={data.list.items ?? []}
    initialMetadata={data.list.metadata ?? {}}
    {workspaceLabel}
    projectNamesById={data.projectNamesById}
  />
</div>
