import { Plug } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export function CommentAutomationNoPagesEmptyState({
  connectHref,
}: {
  connectHref: string;
}) {
  return (
    <Empty className="min-h-80 bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Plug />
        </EmptyMedia>
        <EmptyTitle>No pages connected</EmptyTitle>
        <EmptyDescription>
          Connect an Instagram or Messenger page to start creating Comment automations.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={connectHref}>Connect a channel</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
