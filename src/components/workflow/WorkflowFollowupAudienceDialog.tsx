import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkflowFollowupAudienceField } from './WorkflowFollowupAudienceField';

export function WorkflowFollowupAudienceDialog() {
  return (
    <DialogContent
      className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <DialogHeader className="border-b border-border px-6 py-6 pr-14">
        <DialogTitle>Who to follow up with</DialogTitle>
        <DialogDescription>
          Which customers should receive follow-ups?
        </DialogDescription>
      </DialogHeader>
      <div className="flex max-h-[calc(100vh-10rem)] flex-col gap-2.5 overflow-y-auto px-6 py-6">
        <WorkflowFollowupAudienceField />
      </div>
    </DialogContent>
  );
}
