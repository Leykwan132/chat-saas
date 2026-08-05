import { useParams } from 'react-router';
import { BellRing } from 'lucide-react';
import type { Id } from '../../convex/_generated/dataModel';
import { TelegramNotificationsPanel } from '@/components/agent-setup/TelegramNotificationsPanel';

export default function NotificationsPage() {
  const { agentId } = useParams();

  return (
    <div className="flex w-full flex-col gap-8">
      <header>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            <BellRing className="size-3 text-primary" />
            Telegram only
          </span>
        </div>
        <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">Notifications</h1>
      </header>
      <TelegramNotificationsPanel agentId={agentId as Id<'agents'>} />
    </div>
  );
}
