/** WorkOS permission slugs used for fine-grained RBAC gating. */
import { DEFAULT_MEMBER_FEATURE_ACCESS } from './teamAccessCatalog';

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
};

/** Permission category mappings to group them nicely in the UI */
export type PermissionCategory = 'AI Agent' | 'Chats & Customers' | 'Team & Billing' | 'WorkOS Widgets';

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
  
  [Permission.TEAM_READ]: 'Team & Billing',
  [Permission.TEAM_MANAGE]: 'Team & Billing',
  [Permission.FULL_CONTROL]: 'Team & Billing',
  [Permission.BILLING_READ]: 'Team & Billing',
  [Permission.BILLING_MANAGE]: 'Team & Billing',
  [Permission.PERMISSIONS_MANAGE]: 'Team & Billing',
  
  [Permission.WIDGETS_DSYNC_MANAGE]: 'WorkOS Widgets',
  [Permission.WIDGETS_USERS_TABLE_MANAGE]: 'WorkOS Widgets',
};

export type FeatureAccessLevel = 'none' | 'view' | 'edit';
export type TeamFeatureKey = 'agents' | 'chats' | 'team' | 'invitations' | 'billing';
export type TeamFeatureAccess = Record<TeamFeatureKey, FeatureAccessLevel>;

export function mapFeatureAccessToPermissions(
  role: 'owner' | 'admin' | 'member',
  access: TeamFeatureAccess,
): PermissionSlug[] {
  const permissions: PermissionSlug[] = [];

  // Owner always gets all permissions regardless of settings
  if (role === 'owner') {
    return [...ALL_PERMISSION_SLUGS];
  }

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
    // Members should never have permission to assign chats
    if (role !== 'member') {
      permissions.push(Permission.CHATS_ASSIGN);
    }
  } else if (access.chats === 'view') {
    permissions.push(
      Permission.CHATS_READ,
      Permission.CUSTOMERS_READ,
    );
  }

  // 3. Team feature
  if (access.team === 'edit') {
    permissions.push(
      Permission.TEAM_READ,
      Permission.TEAM_MANAGE,
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

  return permissions;
}

/** Default permission sets per role — used when provisioning roles in WorkOS. */
export const ROLE_PERMISSIONS: Record<'owner' | 'admin' | 'member', readonly PermissionSlug[]> = {
  owner: ALL_PERMISSION_SLUGS,
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
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_MANAGE,
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
