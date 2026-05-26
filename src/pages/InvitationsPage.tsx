import { useState } from 'react';
import { useAction } from 'convex/react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { usePendingTeamInvitations } from '@/hooks/usePendingTeamInvitations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { formatOrgRoleLabel } from '../../shared/teamRoleCatalog';

export default function InvitationsPage() {
  const { invitations, loading, refresh } = usePendingTeamInvitations();
  const acceptInvitation = useAction(api.teamInvitations.acceptInvitation);
  const { switchTeam } = useActiveTeam();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (invitationId: string) => {
    setAcceptingId(invitationId);
    try {
      const result = await acceptInvitation({ invitationId });
      toast.success(`Joined ${result.invitation.organizationName}`);

      if (result.teamId) {
        await switchTeam({
          teamId: result.teamId as Id<'teams'>,
          workosOrgId: result.workosOrgId,
        });
      }

      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="mt-4">
      <h1 className="m-0 text-3xl font-semibold tracking-tight">Invitations</h1>

      <div className="mt-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Spinner className="size-6" />
          </div>
        ) : invitations.length === 0 ? (
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Mail />
              </EmptyMedia>
              <EmptyTitle>No invitations to join a team</EmptyTitle>
              <EmptyDescription>
                When someone invites you to a shared workspace, it will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {invitations.map((invitation) => {
                const isAccepting = acceptingId === invitation.id;
                return (
                  <li
                    key={invitation.id}
                    className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{invitation.organizationName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {invitation.roleSlug ? (
                          <Badge variant="secondary" className="font-normal">
                            {formatOrgRoleLabel(invitation.roleSlug)}
                          </Badge>
                        ) : null}
                        {invitation.expiresAt ? (
                          <span>
                            Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="shrink-0"
                      disabled={isAccepting}
                      onClick={() => void handleAccept(invitation.id)}
                    >
                      {isAccepting ? <Spinner className="size-4" /> : 'Accept'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
