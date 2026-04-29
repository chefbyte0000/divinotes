<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { MoreHorizontal, Pause, Play, Archive } from "@lucide/svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

  let {
    campaignId,
    isActive,
    isRecurring,
  }: {
    campaignId: string;
    isActive: boolean;
    isRecurring: boolean;
  } = $props();

  let pauseForm: HTMLFormElement | undefined = $state();
  let resumeForm: HTMLFormElement | undefined = $state();
  let archiveForm: HTMLFormElement | undefined = $state();
  let busy = $state(false);

  function afterToggle() {
    busy = true;
    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      await invalidateAll();
      busy = false;
    };
  }
</script>

<form
  bind:this={pauseForm}
  method="POST"
  action="?/toggleCampaignActive"
  class="hidden"
  aria-hidden="true"
  use:enhance={afterToggle}
>
  <input type="hidden" name="campaignId" value={campaignId} />
  <input type="hidden" name="nextActive" value="false" />
</form>

<form
  bind:this={resumeForm}
  method="POST"
  action="?/toggleCampaignActive"
  class="hidden"
  aria-hidden="true"
  use:enhance={afterToggle}
>
  <input type="hidden" name="campaignId" value={campaignId} />
  <input type="hidden" name="nextActive" value="true" />
</form>

<form
  bind:this={archiveForm}
  method="POST"
  action="?/archiveCampaign"
  class="hidden"
  aria-hidden="true"
  use:enhance={afterToggle}
>
  <input type="hidden" name="campaignId" value={campaignId} />
</form>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        class="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        disabled={busy}
        aria-label="Campaign actions"
      >
        <MoreHorizontal class="h-4 w-4" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-52">
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#if isRecurring && isActive}
      <DropdownMenu.Item
        disabled={busy}
        onSelect={(e) => {
          e.preventDefault();
          pauseForm?.requestSubmit();
        }}
      >
        <Pause class="mr-2 h-4 w-4" /> Pause schedule
      </DropdownMenu.Item>
    {:else if isRecurring && !isActive}
      <DropdownMenu.Item
        disabled={busy}
        onSelect={(e) => {
          e.preventDefault();
          resumeForm?.requestSubmit();
        }}
      >
        <Play class="mr-2 h-4 w-4" /> Resume schedule
      </DropdownMenu.Item>
    {/if}
    <DropdownMenu.Item
      disabled={busy}
      onSelect={(e) => {
        e.preventDefault();
        archiveForm?.requestSubmit();
      }}
    >
      <Archive class="mr-2 h-4 w-4" /> Archive
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
