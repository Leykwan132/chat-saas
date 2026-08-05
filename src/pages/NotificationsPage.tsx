import { useParams } from 'react-router';
import type { Id } from '../../convex/_generated/dataModel';
import { TelegramNotificationsPanel } from '@/components/agent-setup/TelegramNotificationsPanel';
import { PageTitleBlock } from '@/components/PageTitleBlock';

export default function NotificationsPage() {
  const { agentId } = useParams();

  return (
    <div className="flex w-full flex-col gap-8">
      <PageTitleBlock
        title="Notifications"
        description="Telegram is currently the only supported notification channel."
      />
      <TelegramNotificationsPanel agentId={agentId as Id<'agents'>} />
    </div>
  );
}
