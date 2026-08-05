import { useParams } from 'react-router';
import { FaTelegramPlane } from 'react-icons/fa';
import type { Id } from '../../convex/_generated/dataModel';
import { TelegramNotificationsPanel } from '@/components/agent-setup/TelegramNotificationsPanel';

export default function NotificationsPage() {
  const { agentId } = useParams();

  return (
    <div className="flex w-full flex-col gap-8">
      <header>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            <FaTelegramPlane className="size-3 text-[#229ED9]" />
            Telegram only
          </span>
        </div>
        <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Telegram is currently the only supported notification channel.
        </p>
      </header>
      <TelegramNotificationsPanel agentId={agentId as Id<'agents'>} />
    </div>
  );
}
