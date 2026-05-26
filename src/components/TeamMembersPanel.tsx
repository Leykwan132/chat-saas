import { useCallback, useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  getAssignableTeamRoleOptions,
  WORKOS_MEMBER_ROLE_SLUG,
  formatOrgRoleLabel,
} from '../../shared/teamRoleCatalog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { formatTeamCreatedAt } from '@/lib/teamDisplay';
import { TeamSectionHeader } from '@/components/teams/TeamSectionHeader';
import { cn } from '@/lib/utils';

type TeamMemberItem = {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  profilePictureUrl: string | null;
  roleSlug: string | null;
  createdAt: string;
};

type TeamMembersPanelProps = {
  teamId?: Id<'teams'>;
  canManage?: boolean;
  canAssignOwner?: boolean;
  disabledReason?: string | null;
  className?: string;
};

function memberInitials(member: TeamMemberItem) {
  const parts = member.displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return member.displayName.trim().slice(0, 2).toUpperCase() || 'U';
}

export function TeamMembersPanel({
  teamId,
  canManage = false,
  canAssignOwner = false,
  disabledReason,
  className,
}: TeamMembersPanelProps) {
  const { user } = useAuth();
  const listMembers = useAction(api.teamMembers.listForTeam);
  const updateMemberRole = useAction(api.teamMembers.updateMemberRole);
  const removeMember = useAction(api.teamMembers.removeMember);

  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TeamMemberItem | null>(null);
  const [editRoleSlug, setEditRoleSlug] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberItem | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMembers(teamId ? { teamId } : {});
      setMembers(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load team members');
    } finally {
      setLoading(false);
    }
  }, [listMembers, teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleEditDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditTarget(null);
      setEditRoleSlug('');
    }
  };

  const openEditDialog = (member: TeamMemberItem) => {
    setEditTarget(member);
    setEditRoleSlug(member.roleSlug ?? WORKOS_MEMBER_ROLE_SLUG);
  };

  const handleSaveRole = async () => {
    if (!canManage || !teamId || !editTarget || savingRole) {
      return;
    }

    setSavingRole(true);
    try {
      await updateMemberRole({
        teamId,
        membershipId: editTarget.id,
        roleSlug: editRoleSlug,
      });
      toast.success('Member role updated');
      handleEditDialogOpenChange(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update member role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleRemove = async () => {
    if (!canManage || !teamId || !removeTarget) {
      return;
    }

    setActingOnId(removeTarget.id);
    try {
      await removeMember({
        teamId,
        membershipId: removeTarget.id,
      });
      toast.success('Member removed');
      setRemoveTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove member');
    } finally {
      setActingOnId(null);
    }
  };

  const roleOptions = getAssignableTeamRoleOptions(canAssignOwner);

  const showActions = canManage && teamId !== undefined;

  if (loading) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <TeamSectionHeader title="Members" />
        <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-10">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <TeamSectionHeader title="Members" />
        {!canManage && disabledReason ? (
          <p className="text-sm text-muted-foreground">{disabledReason}</p>
        ) : null}
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          No members found for this team.
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <TeamSectionHeader title="Members" />

      {!canManage && disabledReason ? (
        <p className="text-sm text-muted-foreground">{disabledReason}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                {showActions ? <th className="px-4 py-3 font-medium text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isActing = actingOnId === member.id;
                const isCurrentUser = user?.id === member.userId;

                return (
                  <tr key={member.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {member.profilePictureUrl ? (
                          <img
                            src={member.profilePictureUrl}
                            alt={member.displayName}
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                            {memberInitials(member)}
                          </div>
                        )}
                        <span className="font-medium text-foreground">{member.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {formatOrgRoleLabel(member.roleSlug)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {formatTeamCreatedAt(new Date(member.createdAt).getTime())}
                    </td>
                    {showActions ? (
                      <td className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={isActing}
                              aria-label={`Actions for ${member.displayName}`}
                            >
                              {isActing ? (
                                <Spinner className="size-4" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuItem
                              className="cursor-pointer gap-2"
                              onSelect={() => openEditDialog(member)}
                            >
                              <Pencil className="size-4" />
                              Edit role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
                              disabled={isCurrentUser}
                              onSelect={() => setRemoveTarget(member)}
                            >
                              <Trash2 className="size-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={editTarget !== null} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member role</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `Update the role for ${editTarget.displayName} in this organization.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="member-role">Role</Label>
            <Select value={editRoleSlug} onValueChange={setEditRoleSlug} disabled={savingRole}>
              <SelectTrigger id="member-role" className="w-full">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingRole}
              onClick={() => handleEditDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={savingRole || !editRoleSlug}
              onClick={() => void handleSaveRole()}
            >
              {savingRole ? <Spinner className="size-4" /> : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove?</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${removeTarget.displayName} will lose access to this organization and its teams. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={actingOnId === removeTarget?.id}
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
              disabled={actingOnId === removeTarget?.id}
              onClick={() => void handleRemove()}
            >
              {actingOnId === removeTarget?.id ? <Spinner className="size-4" /> : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
