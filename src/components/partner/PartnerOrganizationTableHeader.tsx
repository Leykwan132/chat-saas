import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
export function PartnerOrganizationTableHeader() {
  return (
    <TableHeader className="bg-muted [&_th]:font-semibold [&_th]:text-foreground">
      <TableRow>
        <TableHead>Organization</TableHead>
        <TableHead className="text-center">Users</TableHead>
        <TableHead className="text-center">Plan</TableHead>
        <TableHead className="text-center">Model</TableHead>
        <TableHead className="text-center">Agents</TableHead>
        <TableHead className="text-center">Monthly</TableHead>
        <TableHead className="text-center">Top-up</TableHead>
        <TableHead className="text-center">Remaining</TableHead>
        <TableHead className="text-center">Status</TableHead>
        <TableHead className="text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
