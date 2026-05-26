export type FeatureAccessLevel = 'none' | 'view' | 'edit';

export type TeamFeatureKey = 'agents' | 'chats' | 'team' | 'invitations' | 'billing';

export type TeamFeatureAccess = Record<TeamFeatureKey, FeatureAccessLevel>;

export const TEAM_FEATURE_KEYS: TeamFeatureKey[] = [
  'agents',
  'chats',
  'team',
  'invitations',
  'billing',
];

export const TEAM_FEATURES: ReadonlyArray<{
  key: TeamFeatureKey;
  label: string;
  description: string;
}> = [
  {
    key: 'agents',
    label: 'Agents',
    description: 'Create and manage AI agents and automation flows.',
  },
  {
    key: 'chats',
    label: 'Chats',
    description: 'View, assign, and reply in the inbox.',
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Team settings, members, and roles.',
  },
  {
    key: 'invitations',
    label: 'Invitations',
    description: 'Send and manage teammate invitations.',
  },
  {
    key: 'billing',
    label: 'Billing & usage',
    description: 'Plan, credits, and usage.',
  },
];

export const FEATURE_ACCESS_OPTIONS: ReadonlyArray<{
  value: FeatureAccessLevel;
  label: string;
}> = [
  { value: 'none', label: 'No access' },
  { value: 'view', label: 'View only' },
  { value: 'edit', label: 'Edit' },
];

export const DEFAULT_MEMBER_FEATURE_ACCESS: TeamFeatureAccess = {
  agents: 'view',
  chats: 'edit',
  team: 'none',
  invitations: 'none',
  billing: 'none',
};

export const DEFAULT_ADMIN_FEATURE_ACCESS: TeamFeatureAccess = {
  agents: 'edit',
  chats: 'edit',
  team: 'edit',
  invitations: 'edit',
  billing: 'view',
};

export const DEFAULT_OWNER_FEATURE_ACCESS: TeamFeatureAccess = {
  agents: 'edit',
  chats: 'edit',
  team: 'edit',
  invitations: 'edit',
  billing: 'edit',
};

export function isValidFeatureAccessLevel(value: string): value is FeatureAccessLevel {
  return value === 'none' || value === 'view' || value === 'edit';
}

export function normalizeTeamFeatureAccess(
  input: Partial<TeamFeatureAccess> | undefined,
  fallback: TeamFeatureAccess = DEFAULT_MEMBER_FEATURE_ACCESS,
): TeamFeatureAccess {
  const access = { ...fallback };
  if (!input) {
    return access;
  }

  for (const key of TEAM_FEATURE_KEYS) {
    const level = input[key];
    if (level !== undefined && isValidFeatureAccessLevel(level)) {
      access[key] = level;
    }
  }

  return access;
}

/** Map legacy see/use slugs to the feature access model. */
export function featureAccessFromLegacySlugs(slugs: string[]): TeamFeatureAccess {
  const level = (seeSlug: string, editSlug: string): FeatureAccessLevel => {
    if (slugs.includes(editSlug)) return 'edit';
    if (slugs.includes(seeSlug)) return 'view';
    return 'none';
  };

  return {
    agents: level('see-agents', 'use-agents'),
    chats: level('see-chats', 'use-chats'),
    team: level('see-team', 'use-team'),
    invitations: slugs.includes('use-invites') ? 'edit' : 'none',
    billing: level('see-billing', 'use-billing'),
  };
}

export function featureAccessEquals(a: TeamFeatureAccess, b: TeamFeatureAccess) {
  return TEAM_FEATURE_KEYS.every((key) => a[key] === b[key]);
}

export function hasFeatureAccess(
  access: TeamFeatureAccess,
  feature: TeamFeatureKey,
  required: 'view' | 'edit',
) {
  const level = access[feature];
  if (required === 'view') {
    return level === 'view' || level === 'edit';
  }
  return level === 'edit';
}
