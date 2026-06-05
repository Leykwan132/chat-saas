/** WorkOS permission slugs used for fine-grained RBAC gating. */
import {
  DEFAULT_MEMBER_FEATURE_ACCESS,
  DEFAULT_OWNER_FEATURE_ACCESS,
} from './teamAccessCatalog';

export const Permission = {
  // Knowledge Base
  KB_READ: 'kb:read',
  KB_MANAGE: 'kb:manage',
  // Channels
  CHANNELS_READ: 'channels:read',
  CHANNELS_MANAGE: 'channels:manage',
  // Automations
  AUTOMATION_READ: 'automation:read',
  AUTOMATION_MANAGE: 'automation:manage',
  // Playground
  PLAYGROUND_ACCESS: 'playground:access',
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  // Chats
  CHATS_READ: 'chats:read',
  CHATS_REPLY: 'chats:reply',
  CHATS_ASSIGN: 'chats:assign',
  CHATS_TAG: 'chats:tag',
  // People routing
  SCHEDULE_READ: 'schedule:read',
  ROUTING_READ: 'routing:read',
  ROUTING_MANAGE: 'routing:manage',
  // Customers
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_MANAGE: 'customers:manage',
  // Team
  TEAM_READ: 'team:read',
  TEAM_MANAGE: 'team:manage',
  FULL_CONTROL: 'full-control',
  // Agents
  AGENTS_CREATE: 'agents:create',
  AGENTS_MANAGE: 'agents:manage',
  // Billing
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',
  // Permissions Management
  PERMISSIONS_MANAGE: 'permissions:manage',
  // WorkOS Widgets (existing)
  WIDGETS_DSYNC_MANAGE: 'widgets:dsync:manage',
  WIDGETS_USERS_TABLE_MANAGE: 'widgets:users-table:manage',
  // Follow-ups & Broadcast
  FOLLOWUPS_READ: 'followups:read',
  FOLLOWUPS_MANAGE: 'followups:manage',
  BROADCAST_READ: 'broadcast:read',
  BROADCAST_MANAGE: 'broadcast:manage',
} as const;

export type PermissionSlug = (typeof Permission)[keyof typeof Permission];

/** All permission slugs as an array — useful for provisioning. */
export const ALL_PERMISSION_SLUGS: PermissionSlug[] = Object.values(Permission);

/** Human-readable permission names — useful for UI display */
export const PERMISSION_NAMES: Record<PermissionSlug, string> = {
  [Permission.KB_READ]: 'View Knowledge Base',
  [Permission.KB_MANAGE]: 'Manage Knowledge Base',
  [Permission.CHANNELS_READ]: 'View Channels',
  [Permission.CHANNELS_MANAGE]: 'Manage Channels',
  [Permission.AUTOMATION_READ]: 'View Automations',
  [Permission.AUTOMATION_MANAGE]: 'Manage Automations',
  [Permission.PLAYGROUND_ACCESS]: 'Use AI Playground',
  [Permission.ANALYTICS_READ]: 'View Analytics',
  [Permission.CHATS_READ]: 'View Chats & Conversations',
  [Permission.CHATS_REPLY]: 'Reply to Chats',
  [Permission.CHATS_ASSIGN]: 'Assign Chats',
  [Permission.CHATS_TAG]: 'Tag Chats & Labels',
  [Permission.SCHEDULE_READ]: 'View Schedule',
  [Permission.ROUTING_READ]: 'View Lead Assignment',
  [Permission.ROUTING_MANAGE]: 'Manage Schedule & Lead Assignment',
  [Permission.CUSTOMERS_READ]: 'View Customer List',
  [Permission.CUSTOMERS_MANAGE]: 'Manage Customer Details',
  [Permission.TEAM_READ]: 'View Team Members',
  [Permission.TEAM_MANAGE]: 'Manage Team Members',
  [Permission.FULL_CONTROL]: 'Full Control',
  [Permission.AGENTS_CREATE]: 'Create AI Agents',
  [Permission.AGENTS_MANAGE]: 'Manage AI Agents',
  [Permission.BILLING_READ]: 'View Billing & Usage',
  [Permission.BILLING_MANAGE]: 'Manage Billing Settings',
  [Permission.PERMISSIONS_MANAGE]: 'Manage Roles & Permissions',
  [Permission.WIDGETS_DSYNC_MANAGE]: 'Manage Directory Sync Widget',
  [Permission.WIDGETS_USERS_TABLE_MANAGE]: 'Manage Users Table Widget',
  [Permission.FOLLOWUPS_READ]: 'View Follow-ups',
  [Permission.FOLLOWUPS_MANAGE]: 'Manage Follow-ups',
  [Permission.BROADCAST_READ]: 'View Broadcast',
  [Permission.BROADCAST_MANAGE]: 'Manage Broadcast',
};

/** Human-readable permission descriptions — useful for UI display */
export const PERMISSION_DESCRIPTIONS: Record<PermissionSlug, string> = {
  [Permission.KB_READ]: 'Access to view knowledge base documents and settings.',
  [Permission.KB_MANAGE]: 'Access to add, update, or remove knowledge base documents.',
  [Permission.CHANNELS_READ]: 'Access to view connected messaging channels.',
  [Permission.CHANNELS_MANAGE]: 'Access to connect, disconnect, or edit messaging channels.',
  [Permission.AUTOMATION_READ]: 'Access to view AI response settings and rules.',
  [Permission.AUTOMATION_MANAGE]: 'Access to create and configure automation rules.',
  [Permission.PLAYGROUND_ACCESS]: 'Access to interact with and test the AI agent playground.',
  [Permission.ANALYTICS_READ]: 'Access to view agent conversation performance and analytics.',
  [Permission.CHATS_READ]: 'Access to view conversations in the inbox.',
  [Permission.CHATS_REPLY]: 'Access to send replies to customer chats.',
  [Permission.CHATS_ASSIGN]: 'Access to reassign conversations to team members.',
  [Permission.CHATS_TAG]: 'Access to add or remove tags and labels on conversations.',
  [Permission.SCHEDULE_READ]: 'Access to view the team schedule.',
  [Permission.ROUTING_READ]: 'Access to view lead assignment settings.',
  [Permission.ROUTING_MANAGE]: 'Access to edit schedule and lead assignment settings.',
  [Permission.CUSTOMERS_READ]: 'Access to view the customer directory.',
  [Permission.CUSTOMERS_MANAGE]: 'Access to create, edit, or delete customer information.',
  [Permission.TEAM_READ]: 'Access to view organization members and roles.',
  [Permission.TEAM_MANAGE]: 'Access to invite, remove, or modify team members.',
  [Permission.FULL_CONTROL]: 'Full control over team roles, permissions, and ownership settings.',
  [Permission.AGENTS_CREATE]: 'Access to create a brand new AI agent.',
  [Permission.AGENTS_MANAGE]: 'Access to edit configurations or delete existing AI agents.',
  [Permission.BILLING_READ]: 'Access to view billing plans, credits, and invoices.',
  [Permission.BILLING_MANAGE]: 'Access to purchase credits, upgrade plan, or update billing.',
  [Permission.PERMISSIONS_MANAGE]: 'Access to view and change permissions for roles.',
  [Permission.WIDGETS_DSYNC_MANAGE]: 'Access to manage directory synchronization widget.',
  [Permission.WIDGETS_USERS_TABLE_MANAGE]: 'Access to manage user list table widget.',
  [Permission.FOLLOWUPS_READ]: 'Access to view customer follow-up configurations and logs.',
  [Permission.FOLLOWUPS_MANAGE]: 'Access to create, edit, or delete customer follow-up rules.',
  [Permission.BROADCAST_READ]: 'Access to view previous broadcast campaigns.',
  [Permission.BROADCAST_MANAGE]: 'Access to trigger and blast new WhatsApp message broadcasts.',
};

/** Permission category mappings to group them nicely in the UI */
export type PermissionCategory = 'AI Agent' | 'Chats & Customers' | 'Team & Billing' | 'People' | 'WorkOS Widgets';

export const PERMISSION_CATEGORIES: Record<PermissionSlug, PermissionCategory> = {
  [Permission.KB_READ]: 'AI Agent',
  [Permission.KB_MANAGE]: 'AI Agent',
  [Permission.CHANNELS_READ]: 'AI Agent',
  [Permission.CHANNELS_MANAGE]: 'AI Agent',
  [Permission.AUTOMATION_READ]: 'AI Agent',
  [Permission.AUTOMATION_MANAGE]: 'AI Agent',
  [Permission.PLAYGROUND_ACCESS]: 'AI Agent',
  [Permission.ANALYTICS_READ]: 'AI Agent',
  [Permission.AGENTS_CREATE]: 'AI Agent',
  [Permission.AGENTS_MANAGE]: 'AI Agent',
  
  [Permission.CHATS_READ]: 'Chats & Customers',
  [Permission.CHATS_REPLY]: 'Chats & Customers',
  [Permission.CHATS_ASSIGN]: 'Chats & Customers',
  [Permission.CHATS_TAG]: 'Chats & Customers',
  [Permission.CUSTOMERS_READ]: 'Chats & Customers',
  [Permission.CUSTOMERS_MANAGE]: 'Chats & Customers',

  [Permission.SCHEDULE_READ]: 'People',
  [Permission.ROUTING_READ]: 'People',
  [Permission.ROUTING_MANAGE]: 'People',
  
  [Permission.TEAM_READ]: 'Team & Billing',
  [Permission.TEAM_MANAGE]: 'Team & Billing',
  [Permission.FULL_CONTROL]: 'Team & Billing',
  [Permission.BILLING_READ]: 'Team & Billing',
  [Permission.BILLING_MANAGE]: 'Team & Billing',
  [Permission.PERMISSIONS_MANAGE]: 'Team & Billing',
  
  [Permission.WIDGETS_DSYNC_MANAGE]: 'WorkOS Widgets',
  [Permission.WIDGETS_USERS_TABLE_MANAGE]: 'WorkOS Widgets',
  
  [Permission.FOLLOWUPS_READ]: 'Chats & Customers',
  [Permission.FOLLOWUPS_MANAGE]: 'Chats & Customers',
  [Permission.BROADCAST_READ]: 'Chats & Customers',
  [Permission.BROADCAST_MANAGE]: 'Chats & Customers',
};

export type FeatureAccessLevel = 'none' | 'view' | 'edit';
export type TeamFeatureKey = 'agents' | 'chats' | 'team' | 'invitations' | 'billing';
export type TeamFeatureAccess = Record<TeamFeatureKey, FeatureAccessLevel>;

const OWNER_ONLY_PERMISSIONS: PermissionSlug[] = [
  Permission.FULL_CONTROL,
  Permission.PERMISSIONS_MANAGE,
  Permission.AGENTS_CREATE,
  Permission.WIDGETS_DSYNC_MANAGE,
  Permission.WIDGETS_USERS_TABLE_MANAGE,
];

export function mapFeatureAccessToPermissions(
  role: 'owner' | 'admin' | 'member',
  access: TeamFeatureAccess,
): PermissionSlug[] {
  const permissions: PermissionSlug[] = [];

  // 1. Agents feature (Knowledge Base, Channels, Automations, Playground, Analytics)
  if (access.agents === 'edit') {
    permissions.push(
      Permission.KB_READ,
      Permission.KB_MANAGE,
      Permission.CHANNELS_READ,
      Permission.CHANNELS_MANAGE,
      Permission.AUTOMATION_READ,
      Permission.AUTOMATION_MANAGE,
      Permission.PLAYGROUND_ACCESS,
      Permission.ANALYTICS_READ,
      Permission.AGENTS_MANAGE,
    );
  } else if (access.agents === 'view') {
    permissions.push(
      Permission.KB_READ,
      Permission.CHANNELS_READ,
      Permission.AUTOMATION_READ,
      Permission.ANALYTICS_READ,
    );
  }

  // 2. Chats feature (Chats, Customers)
  if (access.chats === 'edit') {
    permissions.push(
      Permission.CHATS_READ,
      Permission.CHATS_REPLY,
      Permission.CHATS_TAG,
      Permission.CUSTOMERS_READ,
      Permission.CUSTOMERS_MANAGE,
    );
    // Members should never have permission to assign chats, follow-ups, or broadcasts by default
    if (role !== 'member') {
      permissions.push(
        Permission.CHATS_ASSIGN,
        Permission.FOLLOWUPS_READ,
        Permission.FOLLOWUPS_MANAGE,
        Permission.BROADCAST_READ,
        Permission.BROADCAST_MANAGE,
      );
    }
    permissions.push(Permission.SCHEDULE_READ);
  } else if (access.chats === 'view') {
    permissions.push(
      Permission.CHATS_READ,
      Permission.CUSTOMERS_READ,
      Permission.SCHEDULE_READ,
    );
    if (role !== 'member') {
      permissions.push(
        Permission.FOLLOWUPS_READ,
        Permission.BROADCAST_READ,
      );
    }
  }

  // 3. Team feature
  if (access.team === 'edit') {
    permissions.push(
      Permission.TEAM_READ,
      Permission.TEAM_MANAGE,
      Permission.ROUTING_MANAGE,
    );
  } else if (access.team === 'view') {
    permissions.push(
      Permission.TEAM_READ,
    );
  }

  // 4. Billing feature
  if (access.billing === 'edit') {
    permissions.push(
      Permission.BILLING_READ,
      Permission.BILLING_MANAGE,
    );
  } else if (access.billing === 'view') {
    permissions.push(
      Permission.BILLING_READ,
    );
  }

  if (role === 'owner') {
    for (const slug of OWNER_ONLY_PERMISSIONS) {
      if (!permissions.includes(slug)) {
        permissions.push(slug);
      }
    }
  }

  return permissions;
}

/** Default permission sets per role — used when provisioning roles in WorkOS. */
export const ROLE_PERMISSIONS: Record<'owner' | 'admin' | 'member', readonly PermissionSlug[]> = {
  owner: mapFeatureAccessToPermissions('owner', DEFAULT_OWNER_FEATURE_ACCESS),
  admin: [
    Permission.KB_READ,
    Permission.KB_MANAGE,
    Permission.CHANNELS_READ,
    Permission.CHANNELS_MANAGE,
    Permission.AUTOMATION_READ,
    Permission.AUTOMATION_MANAGE,
    Permission.PLAYGROUND_ACCESS,
    Permission.ANALYTICS_READ,
    Permission.CHATS_READ,
    Permission.CHATS_REPLY,
    Permission.CHATS_ASSIGN,
    Permission.CHATS_TAG,
    Permission.SCHEDULE_READ,
    Permission.ROUTING_READ,
    Permission.ROUTING_MANAGE,
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_MANAGE,
    Permission.FOLLOWUPS_READ,
    Permission.FOLLOWUPS_MANAGE,
    Permission.BROADCAST_READ,
    Permission.BROADCAST_MANAGE,
    Permission.TEAM_READ,
    Permission.TEAM_MANAGE,
    Permission.AGENTS_MANAGE,
    Permission.BILLING_READ,
  ],
  member: mapFeatureAccessToPermissions('member', DEFAULT_MEMBER_FEATURE_ACCESS),
};

export function hasPermission(permissions: string[], required: PermissionSlug): boolean {
  return permissions.includes(required);
}

/** Applies role defaults and migrates legacy member routing grants. */
export function resolvePermissionsForRole(
  role: 'owner' | 'admin' | 'member',
  stored: readonly PermissionSlug[],
): PermissionSlug[] {
  if (role === 'owner') {
    const permissions = [...stored];
    if (!permissions.includes(Permission.FULL_CONTROL)) {
      permissions.push(Permission.FULL_CONTROL);
    }
    if (!permissions.includes(Permission.SCHEDULE_READ)) {
      permissions.push(Permission.SCHEDULE_READ);
    }
    if (!permissions.includes(Permission.FOLLOWUPS_READ)) {
      permissions.push(Permission.FOLLOWUPS_READ);
    }
    if (!permissions.includes(Permission.FOLLOWUPS_MANAGE)) {
      permissions.push(Permission.FOLLOWUPS_MANAGE);
    }
    if (!permissions.includes(Permission.BROADCAST_READ)) {
      permissions.push(Permission.BROADCAST_READ);
    }
    if (!permissions.includes(Permission.BROADCAST_MANAGE)) {
      permissions.push(Permission.BROADCAST_MANAGE);
    }
    return permissions;
  }

  if (role === 'admin') {
    const permissions = [...stored];
    if (!permissions.includes(Permission.SCHEDULE_READ)) {
      permissions.push(Permission.SCHEDULE_READ);
    }
    if (!permissions.includes(Permission.FOLLOWUPS_READ)) {
      permissions.push(Permission.FOLLOWUPS_READ);
    }
    if (!permissions.includes(Permission.FOLLOWUPS_MANAGE)) {
      permissions.push(Permission.FOLLOWUPS_MANAGE);
    }
    if (!permissions.includes(Permission.BROADCAST_READ)) {
      permissions.push(Permission.BROADCAST_READ);
    }
    if (!permissions.includes(Permission.BROADCAST_MANAGE)) {
      permissions.push(Permission.BROADCAST_MANAGE);
    }
    return permissions;
  }

  const permissions = stored.filter(
    (slug) =>
      slug !== Permission.ROUTING_READ &&
      slug !== Permission.ROUTING_MANAGE &&
      slug !== Permission.FOLLOWUPS_READ &&
      slug !== Permission.FOLLOWUPS_MANAGE &&
      slug !== Permission.BROADCAST_READ &&
      slug !== Permission.BROADCAST_MANAGE,
  );
  const hasChats =
    permissions.includes(Permission.CHATS_READ) ||
    permissions.includes(Permission.CHATS_REPLY);
  if (hasChats && !permissions.includes(Permission.SCHEDULE_READ)) {
    permissions.push(Permission.SCHEDULE_READ);
  }
  return permissions;
}
