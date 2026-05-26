import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  ORG_ROLE_DEFINITIONS,
  type OrgRoleKey,
} from '../../../shared/teamRoleCatalog';
import {
  Permission,
  type PermissionCategory,
  type PermissionSlug,
} from '../../../shared/permissions';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { TeamSectionHeader } from '@/components/teams/TeamSectionHeader';
import { usePermissions } from '@/hooks/usePermissions';

type TeamRolesAndPermissionsPanelProps = {
  teamId: Id<'teams'>;
  canManage?: boolean;
  canManageAllRoles?: boolean;
  disabledReason?: string | null;
  className?: string;
};

type UiPermissionKey =
  | 'kb'
  | 'channels'
  | 'automation'
  | 'playground'
  | 'analytics'
  | 'chats'
  | 'customers'
  | 'team'
  | 'agents'
  | 'billing'
  | 'permissions'
  | 'widgets_dsync'
  | 'widgets_users_table';

type UiPermissionItem = {
  key: UiPermissionKey;
  label: string;
  description: string;
  category: PermissionCategory;
  type: 'edit-view' | 'view' | 'edit';
};

const CONSOLIDATED_ITEMS: UiPermissionItem[] = [
  // Chats & Customers category
  {
    key: 'chats',
    label: 'Chats',
    description: 'Access to read, reply, tag, or reassign conversation threads.',
    category: 'Chats & Customers',
    type: 'edit-view',
  },
  {
    key: 'customers',
    label: 'Customer List',
    description: 'Access to view, create, or modify customer records.',
    category: 'Chats & Customers',
    type: 'edit-view',
  },
  // AI Agent category
  {
    key: 'kb',
    label: 'Knowledge Base',
    description: 'Access to read, add, edit, or delete knowledge base documents.',
    category: 'AI Agent',
    type: 'edit-view',
  },
  {
    key: 'channels',
    label: 'Channels',
    description: 'Access to view, connect, or disconnect messaging channels.',
    category: 'AI Agent',
    type: 'edit-view',
  },
  {
    key: 'automation',
    label: 'Automations',
    description: 'Access to view, create, or update AI automation rules.',
    category: 'AI Agent',
    type: 'edit-view',
  },
  {
    key: 'playground',
    label: 'AI Playground',
    description: 'Access to use and interact with the AI agent playground.',
    category: 'AI Agent',
    type: 'view',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Access to view AI agent conversation performance metrics.',
    category: 'AI Agent',
    type: 'view',
  },
  {
    key: 'agents',
    label: 'AI Agents',
    description: 'Access to create, configure, or delete AI agents.',
    category: 'AI Agent',
    type: 'edit',
  },
  // Team & Billing category
  {
    key: 'team',
    label: 'Team Members',
    description: 'Access to view, invite, or manage organization members.',
    category: 'Team & Billing',
    type: 'edit-view',
  },
  {
    key: 'billing',
    label: 'Billing & Usage',
    description: 'Access to view plan details, usage metrics, or purchase credits.',
    category: 'Team & Billing',
    type: 'edit-view',
  },
  {
    key: 'permissions',
    label: 'Full control',
    description: 'Access to view and change role permission definitions.',
    category: 'Team & Billing',
    type: 'edit',
  },
];

const ITEM_PERMISSIONS: Record<UiPermissionKey, { read: PermissionSlug[]; manage: PermissionSlug[] }> = {
  kb: {
    read: [Permission.KB_READ],
    manage: [Permission.KB_MANAGE],
  },
  channels: {
    read: [Permission.CHANNELS_READ],
    manage: [Permission.CHANNELS_MANAGE],
  },
  automation: {
    read: [Permission.AUTOMATION_READ],
    manage: [Permission.AUTOMATION_MANAGE],
  },
  playground: {
    read: [Permission.PLAYGROUND_ACCESS],
    manage: [],
  },
  analytics: {
    read: [Permission.ANALYTICS_READ],
    manage: [],
  },
  agents: {
    read: [Permission.AGENTS_MANAGE],
    manage: [Permission.AGENTS_CREATE, Permission.AGENTS_MANAGE],
  },
  chats: {
    read: [Permission.CHATS_READ, Permission.CHATS_REPLY, Permission.CHATS_TAG],
    manage: [Permission.CHATS_READ, Permission.CHATS_REPLY, Permission.CHATS_TAG, Permission.CHATS_ASSIGN],
  },
  customers: {
    read: [Permission.CUSTOMERS_READ],
    manage: [Permission.CUSTOMERS_MANAGE],
  },
  team: {
    read: [Permission.TEAM_READ],
    manage: [Permission.TEAM_MANAGE],
  },
  billing: {
    read: [Permission.BILLING_READ],
    manage: [Permission.BILLING_MANAGE],
  },
  permissions: {
    read: [],
    manage: [Permission.FULL_CONTROL],
  },
  widgets_dsync: {
    read: [],
    manage: [Permission.WIDGETS_DSYNC_MANAGE],
  },
  widgets_users_table: {
    read: [],
    manage: [Permission.WIDGETS_USERS_TABLE_MANAGE],
  },
};

function getAccessValue(key: UiPermissionKey, permissions: string[]): 'edit' | 'view' | 'none' {
  const mapping = ITEM_PERMISSIONS[key];
  if (!mapping) return 'none';

  const hasAllManage = mapping.manage.length > 0 && mapping.manage.every(p => permissions.includes(p));
  const hasAllRead = mapping.read.length > 0 && mapping.read.every(p => permissions.includes(p));

  if (hasAllManage) {
    return 'edit';
  }
  if (mapping.manage.length > 0 && mapping.read.length === 0) {
    return hasAllManage ? 'edit' : 'none';
  }
  if (mapping.read.length > 0 && mapping.manage.length === 0) {
    return hasAllRead ? 'view' : 'none';
  }

  if (hasAllRead) {
    return 'view';
  }
  return 'none';
}

function getUpdatedPermissions(
  key: UiPermissionKey,
  value: 'edit' | 'view' | 'none',
  currentPermissions: string[],
  role: OrgRoleKey,
): string[] {
  const mapping = ITEM_PERMISSIONS[key];
  if (!mapping) return currentPermissions;

  const allItemSlugs = [...mapping.read, ...mapping.manage];
  let updated = currentPermissions.filter(p => !(allItemSlugs as string[]).includes(p));

  if (value === 'edit') {
    const manageToAssign = mapping.manage.filter((p) => {
      if (p === Permission.AGENTS_CREATE && role !== 'owner') {
        return false;
      }
      return true;
    });
    updated = [...updated, ...mapping.read, ...manageToAssign];
  } else if (value === 'view') {
    updated = [...updated, ...mapping.read];
  }

  return Array.from(new Set(updated));
}

function PermissionsListEditor({
  draftPermissions,
  readOnly = false,
  onChange,
}: {
  draftPermissions: string[];
  readOnly?: boolean;
  onChange: (key: UiPermissionKey, value: 'edit' | 'view' | 'none') => void;
}) {
  const groupedItems = useMemo(() => {
    const groups: Record<PermissionCategory, UiPermissionItem[]> = {
      'Chats & Customers': [],
      'AI Agent': [],
      'Team & Billing': [],
      People: [],
      'WorkOS Widgets': [],
    };
    CONSOLIDATED_ITEMS.forEach((item) => {
      groups[item.category].push(item);
    });
    return groups;
  }, []);

  return (
    <div className="flex flex-col gap-8 py-2">
      {(Object.keys(groupedItems) as PermissionCategory[]).map((category) => {
        const itemsInCategory = groupedItems[category];
        if (itemsInCategory.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-2.5">
            <h3 className="text-sm font-semibold text-foreground px-1 mb-1.5">
              {category}
            </h3>
            <ul className="flex flex-col gap-4">
              {itemsInCategory.map((item) => {
                const value = getAccessValue(item.key, draftPermissions);
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground leading-none">
                        {item.label}
                      </div>
                      <div className="mt-1.5 text-xs text-muted-foreground leading-normal">
                        {item.description}
                      </div>
                    </div>
                    <div className="ml-auto shrink-0">
                      <Select
                        value={value}
                        onValueChange={(val) => onChange(item.key, val as 'edit' | 'view' | 'none')}
                        disabled={readOnly}
                      >
                        <SelectTrigger size="sm" className="w-fit min-w-[80px] gap-1.5 px-3 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {item.type === 'edit-view' && (
                            <>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="none">No access</SelectItem>
                            </>
                          )}
                          {item.type === 'view' && (
                            <>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="none">No access</SelectItem>
                            </>
                          )}
                          {item.type === 'edit' && (
                            <>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="none">No access</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function RoleRow({
  title,
  description,
  canManage,
  onManage,
}: {
  title: string;
  description: string;
  canManage: boolean;
  onManage: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <div className="font-medium text-foreground">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={onManage}>
        <Settings2 className="size-3.5" />
        {canManage ? 'Manage' : 'View'}
      </Button>
    </li>
  );
}

function savedPermissionsForRole(
  role: OrgRoleKey,
  roleAccess: {
    ownerPermissions: string[];
    adminPermissions: string[];
    memberPermissions: string[];
  },
) {
  if (role === 'owner') return roleAccess.ownerPermissions;
  if (role === 'admin') return roleAccess.adminPermissions;
  return roleAccess.memberPermissions;
}

export function TeamRolesAndPermissionsPanel({
  teamId,
  canManage = false,
  canManageAllRoles = false,
  disabledReason,
  className,
}: TeamRolesAndPermissionsPanelProps) {
  const { can } = usePermissions();
  const roleAccess = useQuery(api.teamAccess.getRoleAccessForTeam, { teamId });
  const updateRoleAccess = useMutation(api.teamAccess.updateRoleAccessForTeam);

  const [managedRole, setManagedRole] = useState<OrgRoleKey | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const canEditPermissions = can(Permission.FULL_CONTROL);

  const canEditManagedRole =
    managedRole !== null &&
    canManage &&
    canEditPermissions &&
    (canManageAllRoles || managedRole === 'member');

  useEffect(() => {
    if (managedRole === null || !roleAccess) return;
    setDraftPermissions(savedPermissionsForRole(managedRole, roleAccess));
  }, [managedRole, roleAccess]);

  const savedAccess =
    managedRole && roleAccess ? savedPermissionsForRole(managedRole, roleAccess) : null;

  const isDirty = useMemo(() => {
    if (!canEditManagedRole || !savedAccess || !draftPermissions) return false;
    if (savedAccess.length !== draftPermissions.length) return true;
    const savedSet = new Set(savedAccess);
    return draftPermissions.some((p) => !savedSet.has(p));
  }, [canEditManagedRole, draftPermissions, savedAccess]);

  const handleManageDialogOpenChange = (open: boolean) => {
    if (!open) {
      setManagedRole(null);
      setDraftPermissions(null);
    }
  };

  const handlePermissionChange = (key: UiPermissionKey, value: 'edit' | 'view' | 'none') => {
    if (!canEditManagedRole || !draftPermissions || !managedRole) return;
    const updated = getUpdatedPermissions(key, value, draftPermissions, managedRole);
    setDraftPermissions(updated);
  };

  const handleSave = async () => {
    if (!canEditManagedRole || saving || !isDirty || !managedRole || !draftPermissions) return;

    setSaving(true);
    try {
      await updateRoleAccess({
        teamId,
        role: managedRole,
        permissions: draftPermissions,
      });
      toast.success(`${managedRole.charAt(0).toUpperCase()}${managedRole.slice(1)} permissions updated`);
      setManagedRole(null);
      setDraftPermissions(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update role permissions');
    } finally {
      setSaving(false);
    }
  };

  const loading = roleAccess === undefined;
  const managedRoleDefinition = ORG_ROLE_DEFINITIONS.find((role) => role.key === managedRole);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <TeamSectionHeader title="Roles & permissions" />

      {disabledReason ? (
        <p className="text-sm text-muted-foreground">{disabledReason}</p>
      ) : !canEditPermissions ? (
        <p className="text-sm text-muted-foreground">
          Only team owners can manage roles and permissions. Teammates can view their access details below.
        </p>
      ) : canManage && !canManageAllRoles ? (
        <p className="text-sm text-muted-foreground">
          Only team owners can change owner and admin access. You can still manage member access.
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-10">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {ORG_ROLE_DEFINITIONS.map((role) => (
              <RoleRow
                key={role.key}
                title={role.name}
                description={role.description}
                canManage={canEditPermissions}
                onManage={() => setManagedRole(role.key)}
              />
            ))}
          </ul>
        </div>
      )}

      <Dialog open={managedRole !== null} onOpenChange={handleManageDialogOpenChange}>
        <DialogContent className="sm:max-w-lg p-8 gap-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {canEditManagedRole ? 'Manage' : 'View'} {managedRoleDefinition?.name} Permissions
            </DialogTitle>
          </DialogHeader>

          <div className="no-scrollbar max-h-[min(65vh,36rem)] overflow-y-auto pr-1">
            {draftPermissions ? (
              <PermissionsListEditor
                draftPermissions={draftPermissions}
                readOnly={!canEditManagedRole}
                onChange={handlePermissionChange}
              />
            ) : null}
          </div>

          <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            {!canEditManagedRole ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-6 w-fit self-end sm:self-auto"
                onClick={() => handleManageDialogOpenChange(false)}
              >
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-6 w-fit self-end sm:self-auto"
                  disabled={saving}
                  onClick={() => handleManageDialogOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full px-6 w-fit self-end sm:self-auto"
                  disabled={!isDirty || saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Spinner className="size-4" /> : 'Save changes'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
