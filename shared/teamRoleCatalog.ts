import {
  DEFAULT_ADMIN_FEATURE_ACCESS,
  DEFAULT_MEMBER_FEATURE_ACCESS,
  DEFAULT_OWNER_FEATURE_ACCESS,
  type TeamFeatureAccess,
  featureAccessFromLegacySlugs,
  normalizeTeamFeatureAccess,
} from './teamAccessCatalog';

export const ORG_ROLE_KEYS = ['owner', 'admin', 'member'] as const;
export type OrgRoleKey = (typeof ORG_ROLE_KEYS)[number];

export type OrgRoleDefinition = {
  key: OrgRoleKey;
  name: string;
  description: string;
  assignable: boolean;
};

export const ORG_ROLE_DEFINITIONS: OrgRoleDefinition[] = [
  {
    key: 'owner',
    name: 'Owner',
    description: 'Full control. Can assign members and configure agents.',
    assignable: true,
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Manage agents, teammates, and workspace settings.',
    assignable: true,
  },
  {
    key: 'member',
    name: 'Member',
    description: 'Can view and use what is assigned to them.',
    assignable: true,
  },
];

/** WorkOS organization role slugs created for each team. */
export function workosOrgRoleSlug(role: OrgRoleKey) {
  return `org-${role}`;
}

export const WORKOS_OWNER_ROLE_SLUG = workosOrgRoleSlug('owner');
export const WORKOS_ADMIN_ROLE_SLUG = workosOrgRoleSlug('admin');
export const WORKOS_MEMBER_ROLE_SLUG = workosOrgRoleSlug('member');

export const WORKOS_APP_ORG_ROLE_SLUGS = ORG_ROLE_KEYS.map(workosOrgRoleSlug);

/** Default WorkOS environment roles to hide from team role pickers. */
export const HIDDEN_WORKOS_ENV_ROLE_SLUGS = ['admin', 'member'] as const;

export const OWNER_WIDGET_PERMISSIONS = [
  'widgets:dsync:manage',
  'widgets:users-table:manage',
] as const;

export const ROLE_FEATURE_ACCESS_DEFAULTS: Record<OrgRoleKey, TeamFeatureAccess> = {
  owner: DEFAULT_OWNER_FEATURE_ACCESS,
  admin: DEFAULT_ADMIN_FEATURE_ACCESS,
  member: DEFAULT_MEMBER_FEATURE_ACCESS,
};

export const ASSIGNABLE_TEAM_ROLE_OPTIONS = ORG_ROLE_DEFINITIONS.filter(
  (role) => role.assignable,
).map((role) => ({
  value: workosOrgRoleSlug(role.key),
  label: role.name,
}));

export function getAssignableTeamRoleOptions(includeOwner: boolean) {
  return ASSIGNABLE_TEAM_ROLE_OPTIONS.filter(
    (option) => includeOwner || option.value !== WORKOS_OWNER_ROLE_SLUG,
  );
}

export type TeamRoleFeatureAccessSettings = {
  ownerFeatureAccess?: Partial<TeamFeatureAccess>;
  adminFeatureAccess?: Partial<TeamFeatureAccess>;
  memberFeatureAccess?: Partial<TeamFeatureAccess>;
};

export function isAppOrgRoleSlug(slug: string) {
  return WORKOS_APP_ORG_ROLE_SLUGS.includes(slug);
}

export function isHiddenWorkosEnvRole(slug: string, type: 'OrganizationRole' | 'EnvironmentRole') {
  if (type === 'OrganizationRole') {
    return false;
  }
  return HIDDEN_WORKOS_ENV_ROLE_SLUGS.includes(slug as (typeof HIDDEN_WORKOS_ENV_ROLE_SLUGS)[number]);
}

export function isWorkosOrgAdminRole(roleSlug: string | null | undefined) {
  if (!roleSlug) return false;
  return (
    roleSlug === 'admin' ||
    roleSlug === WORKOS_ADMIN_ROLE_SLUG ||
    roleSlug === 'owner' ||
    roleSlug === WORKOS_OWNER_ROLE_SLUG
  );
}

export function orgRoleKeyFromWorkosSlug(roleSlug: string | null | undefined): OrgRoleKey {
  if (!roleSlug) return 'member';
  if (roleSlug.includes('owner')) return 'owner';
  if (roleSlug.includes('admin')) return 'admin';
  return 'member';
}

export function formatOrgRoleLabel(roleSlug: string | null | undefined) {
  const key = orgRoleKeyFromWorkosSlug(roleSlug);
  return ORG_ROLE_DEFINITIONS.find((role) => role.key === key)?.name ?? 'Member';
}

export function resolveMemberFeatureAccess(args: {
  memberFeatureAccess?: Partial<TeamFeatureAccess>;
  memberAccessSlugs?: string[];
}): TeamFeatureAccess {
  if (args.memberFeatureAccess !== undefined) {
    return normalizeTeamFeatureAccess(args.memberFeatureAccess);
  }
  if (args.memberAccessSlugs !== undefined && args.memberAccessSlugs.length > 0) {
    return normalizeTeamFeatureAccess(
      featureAccessFromLegacySlugs(args.memberAccessSlugs),
      DEFAULT_MEMBER_FEATURE_ACCESS,
    );
  }
  return { ...DEFAULT_MEMBER_FEATURE_ACCESS };
}

export function getFeatureAccessForOrgRole(
  role: OrgRoleKey,
  settings?: TeamRoleFeatureAccessSettings,
): TeamFeatureAccess {
  const fallback = ROLE_FEATURE_ACCESS_DEFAULTS[role];
  const stored =
    role === 'owner'
      ? settings?.ownerFeatureAccess
      : role === 'admin'
        ? settings?.adminFeatureAccess
        : settings?.memberFeatureAccess;
  return normalizeTeamFeatureAccess(stored, fallback);
}
