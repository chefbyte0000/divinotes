<script lang="ts">
  import PageHeader from "$lib/components/layout/page-header.svelte";
  import DataTable from "$lib/components/ui/data-table/data-table.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Plus } from "@lucide/svelte";
  import { columns, type UserRow } from "./columns.js";
  import { enhance } from "$app/forms";

  interface PageData {
    users: UserRow[];
  }

  let { data }: { data: PageData } = $props();

  // Derive filter facets from actual data
  const uniqueRoles = $derived(
    [...new Set(data.users.map((u) => u.role))].sort(),
  );
  const uniqueStatuses = $derived(
    [
      ...new Set(
        data.users.map((u) => (u.emailVerified ? "Active" : "Pending")),
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

  // Search across name, email, and role
  const searchColumns = ["email", "role"];

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

<div class="flex h-full flex-col">
  <PageHeader
    title="User Directory"
    subtitle="Manage workspace members, their account statuses, and system access."
  >
    <Dialog.Root bind:open={showAddDialog}>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button {...props}>
            <Plus class="mr-2 h-4 w-4" />
            Add User
          </Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
          <Dialog.Title>Add New User</Dialog.Title>
          <Dialog.Description>
            Create a new user account in the workspace.
          </Dialog.Description>
        </Dialog.Header>

        <form
          method="POST"
          action="?/addUser"
          use:enhance={() => {
            isSubmitting = true;
            return async ({ result }) => {
              isSubmitting = false;
              if (result.type === "success") {
                resetForm();
              }
            };
          }}
        >
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
              <label for="name" class="text-sm font-medium"
                >Name (Optional)</label
              >
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
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="standard">Standard User</option>
                <option value="premium">Premium User</option>
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
  </PageHeader>

  <div class="mt-2">
    <!-- Search works across email, name, and role columns -->
    <DataTable data={data.users} {columns} {searchColumns} {filterFacets} />
  </div>
</div>
