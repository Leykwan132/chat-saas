import { Plus } from 'lucide-react';
import type { AddableWorkflowNodeKind } from '../../../shared/workflows';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { workflowAddOptions } from './workflowCatalog';

type WorkflowAddNodeMenuProps = {
  disabled?: boolean;
  onSelect: (kind: AddableWorkflowNodeKind) => void;
};

export function WorkflowAddNodeMenu({
  disabled = false,
  onSelect,
}: WorkflowAddNodeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          className="cursor-pointer rounded-xl border-black bg-black text-white hover:bg-black hover:text-white active:bg-black active:text-white aria-expanded:bg-black aria-expanded:text-white focus-visible:border-black focus-visible:ring-0"
          aria-label="Add workflow node"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Plus data-icon="inline-start" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="bottom"
        sideOffset={14}
        className="w-56 rounded-xl"
      >
        <DropdownMenuGroup>
          {workflowAddOptions.map(({ kind, label, Icon }) => (
            <DropdownMenuItem
              key={kind}
              disabled={disabled}
              onClick={(event) => event.stopPropagation()}
              onSelect={(event) => {
                event.stopPropagation();
                onSelect(kind);
              }}
            >
              <Icon />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
