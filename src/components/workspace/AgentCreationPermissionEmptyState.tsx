import { ShieldAlert } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function AgentCreationPermissionEmptyState() {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlert />
        </EmptyMedia>
        <EmptyTitle>You don’t have permission to create agents</EmptyTitle>
        <EmptyDescription>
          Please contact your workspace admin to request access.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
