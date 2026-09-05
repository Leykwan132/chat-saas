import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export function CommentAutomationEmptyState({ onCreate }: { onCreate(): void }) {
  return (
    <Empty className="min-h-80 border bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquare />
        </EmptyMedia>
        <EmptyTitle>No automations yet</EmptyTitle>
        <EmptyDescription>
          Create an automation to start sending messages when people comment.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate}>Create automation</Button>
      </EmptyContent>
    </Empty>
  );
}
