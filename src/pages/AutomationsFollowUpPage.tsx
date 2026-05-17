import { Link, useParams } from 'react-router';
import { ArrowLeft, MessageCircleReply } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AutomationsFollowUpPage() {
  const { agentId } = useParams();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground" asChild>
          <Link to={`/dashboard/${agentId}/automations`}>
            <ArrowLeft className="size-4" />
            Back to Automations
          </Link>
        </Button>
      </div>

      <header className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircleReply className="size-5" />
          </div>
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground">
              Follow up
            </h1>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              Automation setup
            </p>
          </div>
        </div>
        <p className="m-0 mt-4 text-sm leading-relaxed text-muted-foreground">
          Follow-up automations (for example, a reminder after no reply for 24
          hours) are not configured yet. This space will let you define
          triggers, delays, and which template or message to send once product
          rules are finalized.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
        <p className="m-0 text-sm font-medium text-foreground">Coming soon</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Check back later for triggers, audience filters, and scheduling.
        </p>
      </div>
    </div>
  );
}
