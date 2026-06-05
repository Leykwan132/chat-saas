import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { SiWhatsapp } from 'react-icons/si';
import { ShieldAlert } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type WhatsAppFeatureGateProps = {
  /** The feature name shown in the empty-state headings */
  feature: string;
  children: React.ReactNode;
};

/**
 * Guards Follow-ups, Broadcast, and Message Templates.
 *
 * Rules:
 *  1. Only the workspace **owner** can access these features.
 *  2. A **connected WhatsApp channel** must exist.
 *
 * Any other combination shows a targeted empty state guiding the user
 * to either contact their owner or connect WhatsApp.
 */
export function WhatsAppFeatureGate({ feature, children }: WhatsAppFeatureGateProps) {
  const { agentId } = useParams();
  const { role, isLoading: permLoading } = usePermissions();
  const channels = useQuery(api.channels.listForCurrentOrg, {});

  const hasWhatsApp = useMemo(() => {
    if (!channels) return false;
    return channels.some(
      (c: any) =>
        c.service === 'whatsapp' &&
        c.status === 'connected',
    );
  }, [channels]);

  const isLoadingChannels = channels === undefined;

  if (permLoading || isLoadingChannels) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  // Non-owners: show access-denied state
  if (role !== 'owner') {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-6 py-24 text-center animate-fade-in">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
          <ShieldAlert className="size-8 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Owner access required
          </h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground leading-relaxed">
            {feature} is only available to workspace owners. Ask your workspace owner to grant you access or switch to an owner account.
          </p>
        </div>
      </div>
    );
  }

  // Owner but no WhatsApp channel: guide them to connect
  if (!hasWhatsApp) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-6 py-24 text-center animate-fade-in">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5">
          <SiWhatsapp className="size-8 text-[#25D366]" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Connect WhatsApp first
          </h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground leading-relaxed">
            {feature} requires a connected WhatsApp Business account. Head over to Channels to link yours and get started.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to={`/dashboard/${agentId}/channels`}>
            <SiWhatsapp className="size-4" />
            Open Channels
          </Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
