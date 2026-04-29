<script lang="ts">
  import PageHeader from "$lib/components/layout/page-header.svelte";
  import DataTable from "$lib/components/ui/data-table/data-table.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { toast } from "$lib/toasts/toast";
  import { Megaphone, Plus, UsersRound } from "@lucide/svelte";
  import { createCampaignColumns, type AdminCampaignRow } from "./columns";
  import { createGroupColumns, type AdminGroupRow } from "./group-columns";
  import {
    NOTIFICATION_KIND_OPTIONS,
    RECURRENCE_INTERVAL_OPTIONS,
    WEEKDAY_UTC_OPTIONS,
  } from "$lib/types/notifications";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  let section = $state<"campaigns" | "groups">("campaigns");
  let showComposer = $state(false);
  let submitting = $state(false);
  let groupDialogOpen = $state(false);

  const campaignColumns = $derived(createCampaignColumns());
  const groupColumns = $derived(createGroupColumns());

  const kindFacets = NOTIFICATION_KIND_OPTIONS.map((o) => ({
    columnId: "kind",
    title: "Type",
    options: NOTIFICATION_KIND_OPTIONS.map((x) => x.value),
  }));

  const statusFacets = [
    {
      columnId: "status",
      title: "Status",
      options: ["Active", "Paused", "Completed"],
    },
  ];

  const searchColumns = ["title"];

  let audienceScope = $state<"all" | "roles" | "users" | "group">("all");
  let scheduleMode = $state<"once" | "recurring">("once");
  let interval = $state<"daily" | "weekly" | "monthly">("daily");

  $effect(() => {
    if (form?.success) {
      toast("Saved.", { variant: "success" });
    } else if (form && "error" in form && form.error) {
      toast(String(form.error), { variant: "destructive" });
    }
  });
</script>

<div class="flex h-full min-h-0 min-w-0 flex-col">
  <PageHeader title="Notifications" subtitle="Broadcast announcements, alerts, and reminders. Target everyone, roles, saved groups, or specific users. Recurring schedules use UTC.">
    {#snippet children()}
      <div class="border-border bg-muted/40 flex flex-wrap gap-1 rounded-xl border p-1">
        <Button
          type="button"
          variant={section === "campaigns" ? "secondary" : "ghost"}
          size="sm"
          class="rounded-lg"
          onclick={() => (section = "campaigns")}
        >
          <Megaphone class="mr-1.5 size-4" />
          Campaigns
        </Button>
        <Button
          type="button"
          variant={section === "groups" ? "secondary" : "ghost"}
          size="sm"
          class="rounded-lg"
          onclick={() => (section = "groups")}
        >
          <UsersRound class="mr-1.5 size-4" />
          Audience groups
        </Button>
      </div>
    {/snippet}
  </PageHeader>

  {#if section === "campaigns"}
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onclick={() => (showComposer = true)}>
        <Plus class="mr-1.5 size-4" />
        New notification
      </Button>
    </div>

    <div class="mt-2 min-h-0 min-w-0 flex-1">
      <DataTable
        data={data.campaigns as AdminCampaignRow[]}
        columns={campaignColumns}
        {searchColumns}
        filterFacets={[...kindFacets, ...statusFacets]}
      />
    </div>
  {:else}
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onclick={() => (groupDialogOpen = true)}>
        <Plus class="mr-1.5 size-4" />
        New group
      </Button>
    </div>
    <div class="mt-2 min-h-0 min-w-0 flex-1">
      <DataTable data={data.groups as AdminGroupRow[]} columns={groupColumns} searchColumns={["name"]} />
    </div>
  {/if}
</div>

<Dialog.Root bind:open={showComposer}>
  <Dialog.Content class="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg" showCloseButton={!submitting}>
    <Dialog.Header>
      <Dialog.Title>Send notification</Dialog.Title>
      <Dialog.Description>
        Delivers immediately to the selected audience. Recurring campaigns also schedule the next UTC send.
      </Dialog.Description>
    </Dialog.Header>
    <form
      method="POST"
      action="?/createCampaign"
      class="space-y-4"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          submitting = false;
          await update();
          if (result.type === "success") {
            showComposer = false;
            await invalidateAll();
          }
        };
      }}
    >
      <div class="space-y-2">
        <label for="n-title" class="text-sm font-medium">Title</label>
        <Input id="n-title" name="title" required placeholder="Short headline" />
      </div>
      <div class="space-y-2">
        <label for="n-body" class="text-sm font-medium">Message</label>
        <textarea
          id="n-body"
          name="body"
          required
          rows="4"
          placeholder="Plain text body shown in inbox and toast context."
          class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        ></textarea>
      </div>
      <div class="space-y-2">
        <label for="n-kind" class="text-sm font-medium">Type</label>
        <select
          id="n-kind"
          name="kind"
          class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {#each NOTIFICATION_KIND_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <fieldset class="space-y-3 rounded-lg border border-border p-3">
        <legend class="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">Audience</legend>
        <input type="hidden" name="audienceScope" value={audienceScope} />
        <div class="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={audienceScope === "all" ? "secondary" : "outline"} onclick={() => (audienceScope = "all")}>Everyone</Button>
          <Button type="button" size="sm" variant={audienceScope === "roles" ? "secondary" : "outline"} onclick={() => (audienceScope = "roles")}>By role</Button>
          <Button type="button" size="sm" variant={audienceScope === "users" ? "secondary" : "outline"} onclick={() => (audienceScope = "users")}>Specific users</Button>
          <Button type="button" size="sm" variant={audienceScope === "group" ? "secondary" : "outline"} onclick={() => (audienceScope = "group")}>Saved group</Button>
        </div>

        {#if audienceScope === "roles"}
          <div class="flex flex-wrap gap-3 text-sm">
            <label class="flex items-center gap-2"><input type="checkbox" name="roles" value="admin" /> Admin</label>
            <label class="flex items-center gap-2"><input type="checkbox" name="roles" value="premium" /> Premium</label>
            <label class="flex items-center gap-2"><input type="checkbox" name="roles" value="standard" checked /> Standard</label>
          </div>
        {:else if audienceScope === "users"}
          <div class="space-y-2">
            <label for="n-uids" class="text-sm font-medium">User ids</label>
            <textarea
              id="n-uids"
              name="userIdsText"
              rows="3"
              placeholder="uuid per line or comma-separated"
              class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            ></textarea>
          </div>
        {:else if audienceScope === "group"}
          <div class="space-y-2">
            <label for="n-gid" class="text-sm font-medium">Group</label>
            <select
              id="n-gid"
              name="groupId"
              class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <option value="">Select a group…</option>
              {#each data.groups as g}
                <option value={g.id}>{g.name} ({g.memberCount})</option>
              {/each}
            </select>
          </div>
        {/if}
      </fieldset>

      <fieldset class="space-y-3 rounded-lg border border-border p-3">
        <legend class="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">Delivery</legend>
        <input type="hidden" name="scheduleMode" value={scheduleMode} />
        <div class="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={scheduleMode === "once" ? "secondary" : "outline"} onclick={() => (scheduleMode = "once")}>One-time</Button>
          <Button type="button" size="sm" variant={scheduleMode === "recurring" ? "secondary" : "outline"} onclick={() => (scheduleMode = "recurring")}>Recurring</Button>
        </div>

        {#if scheduleMode === "recurring"}
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-2">
              <label for="n-int" class="text-sm font-medium">Interval</label>
              <select
                id="n-int"
                name="interval"
                bind:value={interval}
                class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {#each RECURRENCE_INTERVAL_OPTIONS as o}
                  <option value={o.value}>{o.label}</option>
                {/each}
              </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-2">
                <label for="n-h" class="text-sm font-medium">Hour UTC</label>
                <Input id="n-h" name="hourUtc" type="number" min="0" max="23" value="9" />
              </div>
              <div class="space-y-2">
                <label for="n-m" class="text-sm font-medium">Minute</label>
                <Input id="n-m" name="minuteUtc" type="number" min="0" max="59" value="0" />
              </div>
            </div>
            {#if interval === "weekly"}
              <div class="space-y-2">
                <label for="n-wd" class="text-sm font-medium">Weekday (UTC)</label>
                <select
                  id="n-wd"
                  name="weekdayUtc"
                  class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  {#each WEEKDAY_UTC_OPTIONS as w}
                    <option value={w.value}>{w.label}</option>
                  {/each}
                </select>
              </div>
            {:else if interval === "monthly"}
              <div class="space-y-2">
                <label for="n-dom" class="text-sm font-medium">Day of month (1–28)</label>
                <Input id="n-dom" name="dayOfMonth" type="number" min="1" max="28" value="1" />
              </div>
            {/if}
          </div>
        {/if}
      </fieldset>

      <Dialog.Footer class="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onclick={() => (showComposer = false)} disabled={submitting}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send"}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={groupDialogOpen}>
  <Dialog.Content class="sm:max-w-md" showCloseButton={!submitting}>
    <Dialog.Header>
      <Dialog.Title>New audience group</Dialog.Title>
      <Dialog.Description>Named list of user ids for reuse in campaigns.</Dialog.Description>
    </Dialog.Header>
    <form
      method="POST"
      action="?/createGroup"
      class="space-y-4"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          submitting = false;
          await update();
          if (result.type === "success") {
            groupDialogOpen = false;
            await invalidateAll();
          }
        };
      }}
    >
      <div class="space-y-2">
        <label for="ng-name" class="text-sm font-medium">Name</label>
        <Input id="ng-name" name="name" required placeholder="e.g. Beta testers" />
      </div>
      <div class="space-y-2">
        <label for="ng-members" class="text-sm font-medium">Member user ids</label>
        <textarea
          id="ng-members"
          name="memberUserIdsText"
          required
          rows="5"
          class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        ></textarea>
      </div>
      <Dialog.Footer class="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onclick={() => (groupDialogOpen = false)} disabled={submitting}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Create"}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
