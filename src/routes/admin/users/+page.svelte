<script lang="ts">
  import PageHeader from "$lib/components/layout/page-header.svelte";
  import DataTable from "$lib/components/ui/data-table/data-table.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Plus } from "@lucide/svelte";
  import { columns, type UserRow } from "./columns.js";

  // Mock data matching the actual DB schema exactly
  const data: UserRow[] = [
    {
      id: "1",
      name: "Alice Freeman",
      email: "alice@divinotion.app",
      role: "admin",
      emailVerified: new Date(),
      image: null,
    },
    {
      id: "2",
      name: "Bob Smith",
      email: "bob@divinotion.app",
      role: "standard",
      emailVerified: null, // Triggers "Pending" status badge
      image: null,
    },
    {
      id: "3",
      name: "Charlie Davis",
      email: "charlie@divinotion.app",
      role: "premium",
      emailVerified: new Date(),
      image: null,
    },
  ];

  const filterFacets = [
    {
      columnId: "role",
      title: "Role",
      options: ["admin", "premium", "standard"],
    },
    { columnId: "status", title: "Status", options: ["Active", "Pending"] },
  ];
</script>

<div class="flex h-full flex-col">
  <PageHeader
    title="User Directory"
    subtitle="Manage workspace members, their account statuses, and system access."
  >
    <Button>
      <Plus class="mr-2 h-4 w-4" />
      Add User
    </Button>
  </PageHeader>

  <div class="mt-2">
    <!-- Search is explicitly bound to the 'email' column ID -->
    <DataTable {data} {columns} searchColumn="email" {filterFacets} />
  </div>
</div>
