import { useCallback, useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { Mail, Plus, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  getAssignableTeamRoleOptions,
  formatOrgRoleLabel,
} from '../../shared/teamRoleCatalog';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { Button } from '@/components/ui/button';
import { mapBackendError } from '@/lib/errorMapping';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TeamSectionHeader } from '@/components/teams/TeamSectionHeader';

type TeamInvitationItem = {
  id: string;
  email: string;
  state: 'pending' | 'accepted' | 'expired' | 'revoked';
  roleSlug: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type TeamInvitationsPanelProps = {
  teamId?: Id<'teams'>;
  canInvite?: boolean;
  canAssignOwner?: boolean;
  inviteDisabledReason?: string | null;
  className?: string;
};

function invitationStateLabel(state: TeamInvitationItem['state']) {
  switch (state) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'expired':
      return 'Expired';
    case 'revoked':
      return 'Revoked';
  }
}

function invitationStateVariant(state: TeamInvitationItem['state']) {
  switch (state) {
    case 'pending':
      return 'secondary' as const;
    case 'accepted':
      return 'default' as const;
    default:
      return 'outline' as const;
  }
}

export function TeamInvitationsPanel({
  teamId: _teamId,
  canInvite = true,
  canAssignOwner = false,
  inviteDisabledReason,
  className,
}: TeamInvitationsPanelProps) {
  const { isPersonal } = useActiveTeam();
  const listInvitations = useAction(api.teamInvitations.listForCurrentOrg);
  const sendInvitation = useAction(api.teamInvitations.sendInvitation);
  const revokeInvitation = useAction(api.teamInvitations.revokeInvitation);
  const resendInvitation = useAction(api.teamInvitations.resendInvitation);

  const [invitations, setInvitations] = useState<TeamInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [sending, setSending] = useState(false);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TeamInvitationItem | null>(null);
  const roleOptions = getAssignableTeamRoleOptions(canAssignOwner);

  const refresh = useCallback(async () => {
    if (isPersonal) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await listInvitations({});
      setInvitations(rows);
    } catch (err) {
      const mapped = mapBackendError(err, 'Could not load invitations');
      toast.error(mapped.title, { description: mapped.message });
    } finally {
      setLoading(false);
    }
  }, [isPersonal, listInvitations]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetDialog = () => {
    setEmail('');
    setRoleSlug('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetDialog();
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPersonal || !canInvite || sending || !roleSlug) return;

    setSending(true);
    try {
      await sendInvitation({ email, roleSlug });
      handleDialogOpenChange(false);
      toast.success('Invitation sent');
      await refresh();
    } catch (err) {
      const mapped = mapBackendError(err, 'Could not send invitation');
      toast.error(mapped.title, { description: mapped.message });
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async () => {
    if (isPersonal || !revokeTarget) return;
    const invitationId = revokeTarget.id;
    setActingOnId(invitationId);
    try {
      await revokeInvitation({ invitationId });
      setRevokeTarget(null);
      toast.success('Invitation revoked');
      await refresh();
    } catch (err) {
      const mapped = mapBackendError(err, 'Could not revoke invitation');
      toast.error(mapped.title, { description: mapped.message });
    } finally {
      setActingOnId(null);
    }
  };

  const handleResend = async (invitationId: string) => {
    if (isPersonal) return;
    setActingOnId(invitationId);
    try {
      await resendInvitation({ invitationId });
      toast.success('Invitation resent');
      await refresh();
    } catch (err) {
      const mapped = mapBackendError(err, 'Could not resend invitation');
      toast.error(mapped.title, { description: mapped.message });
    } finally {
      setActingOnId(null);
    }
  };

  if (isPersonal) {
    return (
      <div className={cn('rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground', className)}>
        Switch to a shared team to view invitations.
      </div>
    );
  }

  const sendInviteButton = canInvite ? (
    <Button type="button" className="gap-1.5" onClick={() => setDialogOpen(true)}>
      <Plus className="size-4" />
      Send invite
    </Button>
  ) : null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <TeamSectionHeader title="Invitations" actions={sendInviteButton} />

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-10">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : invitations.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Mail />
            </EmptyMedia>
            <EmptyTitle>No invitations yet</EmptyTitle>
            <EmptyDescription>
              {canInvite
                ? 'Invite teammates to join this shared workspace.'
                : inviteDisabledReason ?? 'Invitations are not available for this team.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {!canInvite && inviteDisabledReason ? (
            <p className="text-sm text-muted-foreground">{inviteDisabledReason}</p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {invitations.map((invitation) => {
                const isActing = actingOnId === invitation.id;
                return (
                  <li
                    key={invitation.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium text-foreground">
                          {invitation.email}
                        </div>
                        <Badge variant={invitationStateVariant(invitation.state)}>
                          {invitationStateLabel(invitation.state)}
                        </Badge>
                      </div>
                      {invitation.roleSlug || invitation.expiresAt ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {invitation.roleSlug ? (
                            <span>{formatOrgRoleLabel(invitation.roleSlug)}</span>
                          ) : null}
                          {invitation.expiresAt ? (
                            <span>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {invitation.state === 'pending' && canInvite ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isActing}
                          onClick={() => void handleResend(invitation.id)}
                        >
                          {isActing ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          Resend
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
                          disabled={isActing}
                          onClick={() => setRevokeTarget(invitation)}
                        >
                          {isActing ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            <X className="size-3.5" />
                          )}
                          Revoke
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send invite</DialogTitle>
          </DialogHeader>

          <form id="send-invite-form" onSubmit={handleSend} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@company.com"
                disabled={sending}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={roleSlug}
                onValueChange={setRoleSlug}
                disabled={sending}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => handleDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="send-invite-form"
              disabled={sending || email.trim().length === 0 || !roleSlug}
            >
              {sending ? <Spinner className="size-4" /> : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation?</DialogTitle>
            <DialogDescription>
              {revokeTarget
                ? `This will cancel the pending invitation for ${revokeTarget.email}. They will no longer be able to join using this invite.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={actingOnId === revokeTarget?.id}
              onClick={() => setRevokeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
              disabled={actingOnId === revokeTarget?.id}
              onClick={() => void handleRevoke()}
            >
              {actingOnId === revokeTarget?.id ? <Spinner className="size-4" /> : 'Revoke invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
