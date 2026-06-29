import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkflowFollowupScheduleFields } from './WorkflowFollowupScheduleFields';

export function WorkflowFollowupScheduleDialog() {
  return (
    <DialogContent
      className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[960px] gap-0 overflow-hidden p-0 sm:max-w-[960px]"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <DialogHeader className="border-b border-border px-8 py-7 pr-14">
        <DialogTitle>When to follow up</DialogTitle>
        <DialogDescription>
          Choose when follow-ups start, how often they repeat, and when to stop.
        </DialogDescription>
      </DialogHeader>
      <WorkflowFollowupScheduleFields />
    </DialogContent>
  );
}
