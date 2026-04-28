<script lang="ts">
  import PageHeader from "$lib/components/layout/page-header.svelte";
  import DataTable from "$lib/components/ui/data-table/data-table.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Plus } from "@lucide/svelte";
  import { createColumns } from "./columns.js";
  import type { PageProps } from "./$types";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";

  let { data, form }: PageProps = $props();

  // Derive filter facets from actual data
  const uniqueRoles = $derived(
    [...new Set(data.users.map((u) => u.role))].sort(),
  );
  const uniqueStatuses = $derived(
    [
      ...new Set(
        data.users.map((u) => (u.emailVerified ? "active" : "pending")),
      ),
    ].sort(),
  );

  const filterFacets = $derived([
    {
      columnId: "role",
      title: "Role",
      options: uniqueRoles,
    },
    { columnId: "status", title: "Status", options: uniqueStatuses },
  ]);

  const columns = $derived(
    createColumns({
      actorUserId: data.actorUserId,
      allowImpersonate: data.allowImpersonate,
    }),
  );

  /** Global search runs on the name column filterFn (matches whole row). */
  const searchColumns = ["name"];

  let showAddDialog = $state(false);
  let isSubmitting = $state(false);
  let newUserEmail = $state("");
  let newUserName = $state("");
  let newUserRole = $state("standard");

  function resetForm() {
    newUserEmail = "";
    newUserName = "";
    newUserRole = "standard";
    showAddDialog = false;
  }
</script>

<div class="flex h-full min-h-0 min-w-0 flex-col">
  <PageHeader
    title="User Directory"
    subtitle="Members, roles, and email verification. Status becomes active after the user verifies their email; pending means they have not verified yet."
  >
    <Button
      type="button"
      variant="default"
      onclick={() => (showAddDialog = true)}
      aria-expanded={showAddDialog}
      aria-haspopup="dialog"
    >
      <Plus class="mr-2 h-4 w-4" />
      Add user
    </Button>
  </PageHeader>

  <Dialog.Root bind:open={showAddDialog}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title>Add user</Dialog.Title>
        <Dialog.Description>
          Create a new workspace account. They can sign in using your usual auth flow once the record exists.
        </Dialog.Description>
      </Dialog.Header>

      <form
        method="POST"
        action={`${$page.url.pathname}?/addUser`}
        use:enhance={() => {
          isSubmitting = true;
          return async ({ result }) => {
            isSubmitting = false;
            if (result.type === "success") {
              resetForm();
              await invalidateAll();
            }
          };
        }}
      >
        {#if form?.error}
          <p class="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {form.error}
          </p>
        {/if}
        <div class="grid gap-4 py-4">
          <div class="flex flex-col gap-2">
            <label for="email" class="text-sm font-medium">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@example.com"
              bind:value={newUserEmail}
              required
              disabled={isSubmitting}
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="name" class="text-sm font-medium">Name (optional)</label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              bind:value={newUserName}
              disabled={isSubmitting}
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="role" class="text-sm font-medium">Role</label>
            <select
              id="role"
              name="role"
              bind:value={newUserRole}
              disabled={isSubmitting}
              class="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <Dialog.Footer>
          <Button
            type="button"
            variant="outline"
            onclick={() => (showAddDialog = false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !newUserEmail}>
            {isSubmitting ? "Adding..." : "Add User"}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>

  <div class="mt-2 min-h-0 min-w-0 flex-1">
    <!-- Search matches name, email, role, status, and user id -->
    <DataTable data={data.users} {columns} {searchColumns} {filterFacets} />
  </div>
</div>
