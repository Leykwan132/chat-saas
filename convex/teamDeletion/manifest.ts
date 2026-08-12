import type { TableNames } from "../_generated/dataModel";

export type TeamDeletionScope = "orgId" | "teamId" | "workosOrgId";

export type TeamDeletionManifestEntry = {
  key: string;
  table: TableNames;
  index: string;
  field: TeamDeletionScope;
};

export const ACCOUNT_OWNED_TABLES = [
  "users",
  "userCreditPeriods",
  "topUpEntries",
  "referralCodes",
  "referralRedemptions",
  "processedStripePayments",
] as const satisfies readonly TableNames[];

export const DIRECT_ORG_TABLES = [
  "whatsappHistoryIngestMessages",
  "whatsappHistoryIngestThreads",
  "whatsappHistorySyncBatches",
  "whatsappSyncRequests",
  "whatsappConnectionAttempts",
  "agentOverviewDailyConversationFacts",
  "agentOverviewHumanEscalationFacts",
  "conversationAnalyticsFacts",
  "analyticsMetricEntries",
  "conversationTopicAssignments",
  "conversationTopics",
  "conversationLogs",
  "messages",
  "workflowAutomationRuns",
  "whatsappBroadcastRecipients",
  "whatsappBroadcastSchedules",
  "followUpSends",
  "followUpRules",
  "whatsappTemplateMediaAssets",
  "whatsappTemplates",
  "customerImportJobs",
  "customerImports",
  "mediaUploads",
  "oauthSessions",
  "creditUsageEvents",
  "creditLogs",
  "workspaceSetupChecklistStates",
  "webWidgetSettings",
  "avatarConfigurations",
  "conversations",
  "customers",
  "textEntries",
  "fileEntries",
  "webEntries",
  "qaEntries",
  "workflows",
  "channels",
  "agents",
] as const satisfies readonly TableNames[];

export const TEAM_ID_TABLES = [
  "calendarAvailabilityIntervals",
  "calendarEventParticipants",
  "calendarEvents",
  "quickReplies",
  "teamMemberships",
] as const satisfies readonly TableNames[];

export const WORKOS_ORG_TABLES = [
  "teamInvitationRecords",
] as const satisfies readonly TableNames[];

const orgIndexByTable: Record<(typeof DIRECT_ORG_TABLES)[number], string> = {
  whatsappHistoryIngestMessages: "by_orgId",
  whatsappHistoryIngestThreads: "by_orgId",
  whatsappHistorySyncBatches: "by_orgId",
  whatsappSyncRequests: "by_orgId",
  whatsappConnectionAttempts: "by_orgId_and_status",
  agentOverviewDailyConversationFacts: "by_orgId",
  agentOverviewHumanEscalationFacts: "by_orgId",
  conversationAnalyticsFacts: "by_orgId_and_updatedAt",
  analyticsMetricEntries: "by_orgId_and_metric_and_sortKey",
  conversationTopicAssignments: "by_orgId_and_detectedAt",
  conversationTopics: "by_orgId_and_slug",
  conversationLogs: "by_orgId_and_performedAt",
  messages: "by_orgId",
  workflowAutomationRuns: "by_orgId",
  whatsappBroadcastRecipients: "by_orgId",
  whatsappBroadcastSchedules: "by_orgId_and_status",
  followUpSends: "by_orgId",
  followUpRules: "by_orgId_and_isActive",
  whatsappTemplateMediaAssets: "by_orgId",
  whatsappTemplates: "by_orgId_and_channelId",
  customerImportJobs: "by_orgId_and_createdAt",
  customerImports: "by_orgId_and_createdAt",
  mediaUploads: "by_orgId",
  oauthSessions: "by_orgId",
  creditUsageEvents: "by_orgId_and_createdAt",
  creditLogs: "by_orgId",
  workspaceSetupChecklistStates: "by_orgId",
  webWidgetSettings: "by_orgId",
  avatarConfigurations: "by_orgId",
  conversations: "by_orgId_and_lastMessageAt",
  customers: "by_orgId_and_lastSeenAt",
  textEntries: "by_orgId",
  fileEntries: "by_orgId",
  webEntries: "by_orgId",
  qaEntries: "by_orgId",
  workflows: "by_orgId",
  channels: "by_orgId_and_service",
  agents: "by_orgId",
};

const teamIndexByTable: Record<(typeof TEAM_ID_TABLES)[number], string> = {
  calendarAvailabilityIntervals: "by_teamId_and_userId_and_bucketKind_and_bucketKey_and_startAt",
  calendarEventParticipants: "by_teamId_and_userId_and_eventStartAt",
  calendarEvents: "by_teamId_and_startAt",
  quickReplies: "by_teamId",
  teamMemberships: "by_teamId",
};

export const TEAM_DELETION_MANIFEST: readonly TeamDeletionManifestEntry[] = [
  ...DIRECT_ORG_TABLES.map((table) => ({
    key: table,
    table,
    index: orgIndexByTable[table],
    field: "orgId" as const,
  })),
  ...TEAM_ID_TABLES.map((table) => ({
    key: table,
    table,
    index: teamIndexByTable[table],
    field: "teamId" as const,
  })),
  {
    key: "teamInvitationRecords",
    table: "teamInvitationRecords",
    index: "by_workosOrgId",
    field: "workosOrgId",
  },
];
