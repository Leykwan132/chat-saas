import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { appointmentBookingSessionStatusValidator } from "./appointmentBookingSessionStatus";
import {
  telegramRecipientStatusValidator,
  telegramSubscriptionStatusValidator,
} from "./telegramNotifications/validators";
import { telegramNotificationKindsValidator } from "./telegramNotifications/kinds";
import { CUSTOMER_SENTIMENTS } from "../shared/customerSentiment";
import { MediaUploadPurpose } from "../shared/mediaUploadPurpose";
import {
  workflowLayoutOrientationValidator,
  workflowNodeKindValidator,
} from "./workflowValidators";
import {
  webWidgetLayoutValidator,
  webWidgetModeValidator,
  webWidgetThemeValidator,
} from "./webWidgetValidators";
import {
  broadcastPresentationValidator,
  messageKindValidator,
} from "./broadcastMessageValidators";
import {
  workflowTemplateUsageTable,
  workflowTemplateUsageTotalsTable,
} from "./workflowTemplateUsageSchema";
import {
  workflowFollowUpAutomationConfigValidator,
  workflowReminderAutomationConfigValidator,
} from "./workflowAutomationValidators";
import {
  workflowAutomationCostTotalsTable,
  workflowAutomationRunsTable,
  workflowAutomationOperationsTable,
  workflowFollowUpTimersTable,
} from "./workflowAutomationSchema";
import { whatsappTemplateStatusValidator } from "./whatsappTemplateLifecycle";
import {
  deletedTeamOrganizationsTable,
  teamExternalResourcesTable,
  teamDeletionJobsTable,
  teamDeletionStatusValidator,
} from "./teamDeletion/schema";
import {
  googleCalendarExternalEventFields,
  googleCalendarTables,
} from "./googleCalendar/schema";
import { GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX } from "./googleCalendar/constants";

const customerSentimentValidator = v.union(
  ...CUSTOMER_SENTIMENTS.map((sentiment) => v.literal(sentiment)),
);

const serviceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("web"),
  v.literal("avatar"),
);

const conversationServiceValidator = v.union(
  v.literal("playground"),
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("web"),
  v.literal("avatar"),
);

const analyticsMetricValidator = v.union(
  v.literal("conversationCount"),
  v.literal("activeConversationCount"),
  v.literal("convertedCount"),
  v.literal("droppedCount"),
  v.literal("conversionDurationMs"),
  v.literal("firstReplyDurationMs"),
  v.literal("firstReplyCount"),
  v.literal("firstHumanReplyDurationMs"),
  v.literal("firstHumanReplyCount"),
  v.literal("assignedConversationCount"),
  v.literal("messageSentCount"),
  v.literal("avgMessagesPerConversationDenominator"),
  v.literal("channelConversationCount"),
  v.literal("channelConvertedCount"),
  v.literal("topicMentionCount"),
);

const customerServiceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("web"),
  v.literal("avatar"),
  v.literal("manual"),
);

const whatsappSyncTypeValidator = v.union(
  v.literal("smb_app_state_sync"),
  v.literal("history"),
);

const whatsappSyncRequestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("requested"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("not_shared"),
);

const whatsappStagingSyncStatusValidator = v.union(
  v.literal("pending"),
  v.literal("syncing"),
  v.literal("completed"),
  v.literal("failed"),
);

const whatsappHistorySyncStatusValidator = v.union(
  v.literal("requested"),
  v.literal("syncing"),
  v.literal("completed"),
  v.literal("not_shared"),
  v.literal("failed"),
);

const whatsappContactSyncStatusValidator = v.union(
  v.literal("requested"),
  v.literal("syncing"),
  v.literal("completed"),
  v.literal("failed"),
);

const whatsappConnectionAttemptStatusValidator = v.union(
  v.literal("started"),
  v.literal("signup_finished"),
  v.literal("token_ready"),
  v.literal("connected"),
  v.literal("syncing"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("error"),
);

const appointmentFieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("select"),
  v.literal("boolean"),
  v.literal("date"),
  v.literal("time"),
  v.literal("phone"),
);

const appointmentTimeSlotPolicyValidator = v.union(
  v.literal("offer_slots"),
  v.literal("customer_suggests"),
);

const appointmentSalesStyleValidator = v.union(
  v.literal("proactive"),
  v.literal("neutral"),
  v.literal("gentle"),
);

const appointmentAssignmentStrategyValidator = v.union(
  v.literal("conversation_owner"),
  v.literal("balanced"),
  v.literal("round_robin"),
  v.literal("specific_user"),
);

const whatsappTemplateParameterFormatValidator = v.union(v.literal("named"));

const whatsappTemplateHeaderFormatValidator = v.union(
  v.literal("DOCUMENT"),
  v.literal("IMAGE"),
  v.literal("VIDEO"),
);

const whatsappTemplateMediaMimeTypeValidator = v.union(
  v.literal("application/pdf"),
  v.literal("image/jpeg"),
  v.literal("image/jpg"),
  v.literal("image/png"),
  v.literal("video/mp4"),
);

const whatsappTemplateMediaStatusValidator = v.union(
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("failed"),
);

const appointmentCollectedValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

const appointmentServiceFieldValidator = v.object({
  key: v.string(),
  label: v.string(),
  type: appointmentFieldTypeValidator,
  options: v.optional(v.array(v.string())),
});

const appointmentBookingSlotValidator = v.object({
  startAt: v.number(),
  endAt: v.number(),
  assignedUserId: v.id("users"),
  assignedWorkosUserId: v.string(),
  assignedDisplayName: v.optional(v.string()),
});

const whiteLabelPlanKeyValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("growth"),
  v.literal("business"),
);

const whiteLabelPartnerStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
);

const whiteLabelPartnerAccessStatusValidator = v.union(
  v.literal("active"),
  v.literal("revoked"),
);

const whiteLabelOrganizationStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
);

const whiteLabelDomainStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("suspended"),
  v.literal("failed"),
);

const whiteLabelCreditLedgerEventValidator = v.union(
  v.literal("monthly_allowance"),
  v.literal("manual_grant"),
  v.literal("usage_deduction"),
);

export default defineSchema({
  users: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    lastActiveAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripeSubscriptionCurrentPeriodEnd: v.optional(v.number()),
    onboarded: v.optional(v.boolean()),
    onboardingAnswers: v.optional(
      v.object({
        role: v.string(),
        useCase: v.array(v.string()),
        channels: v.array(v.string()),
      })
    ),
    activeTeamId: v.optional(v.id("teams")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workosUserId", ["workosUserId"])
    .index("by_email", ["email"])
    .index("by_activeTeamId", ["activeTeamId"]),
  teams: defineTable({
    type: v.union(v.literal("personal"), v.literal("organizational")),
    name: v.string(),
    ownerId: v.optional(v.id("users")),
    workosOrgId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    deletionStatus: v.optional(teamDeletionStatusValidator),
    deletionStartedAt: v.optional(v.number()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    domain: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    memberFeatureAccess: v.optional(
      v.object({
        agents: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        chats: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        team: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        invitations: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        billing: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
      }),
    ),
    adminFeatureAccess: v.optional(
      v.object({
        agents: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        chats: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        team: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        invitations: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        billing: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
      }),
    ),
    ownerFeatureAccess: v.optional(
      v.object({
        agents: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        chats: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        team: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        invitations: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
        billing: v.union(v.literal("none"), v.literal("view"), v.literal("edit")),
      }),
    ),
    memberAccessSlugs: v.optional(v.array(v.string())),
    ownerPermissions: v.optional(v.array(v.string())),
    adminPermissions: v.optional(v.array(v.string())),
    memberPermissions: v.optional(v.array(v.string())),
    customFields: v.optional(
      v.array(
        v.object({
          key: v.string(),
          label: v.string(),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_workosOrgId", ["workosOrgId"])
    .index("by_ownerId_and_type", ["ownerId", "type"]),
  teamMemberships: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_teamId", ["teamId"])
    .index("by_userId_and_teamId", ["userId", "teamId"]),
  workspaceSetupChecklistStates: defineTable({
    userId: v.id("users"),
    orgId: v.string(),
    introShownAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId_and_orgId", ["userId", "orgId"])
    .index("by_orgId", ["orgId"]),
  // Local cache of WorkOS invitations, kept in sync via webhooks and API actions.
  teamInvitationRecords: defineTable({
    workosInvitationId: v.string(),
    email: v.string(),
    workosOrgId: v.optional(v.string()),
    state: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    roleSlug: v.optional(v.string()),
    inviterWorkosUserId: v.optional(v.string()),
    acceptedWorkosUserId: v.optional(v.string()),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    workosCreatedAt: v.string(),
    workosUpdatedAt: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workosInvitationId", ["workosInvitationId"])
    .index("by_workosOrgId", ["workosOrgId"])
    .index("by_email", ["email"])
    .index("by_email_and_state", ["email", "state"]),
  // Used for webhook idempotency. WorkOS may retry deliveries; dedupe on event.id.
  processedEvents: defineTable({
    eventId: v.string(),
    processedAt: v.number(),
  }).index("by_eventId", ["eventId"]),
  contactRequests: defineTable({
    intent: v.union(
      v.literal("enterprise"),
      v.literal("support"),
      v.literal("demo"),
      v.literal("early_user"),
    ),
    email: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("reviewed"),
      v.literal("closed"),
      v.literal("unread"),
      v.literal("seen"),
      v.literal("replied"),
    ),
    supportDescription: v.optional(v.string()),
    companyName: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
    contactName: v.optional(v.string()),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    numberOfUsers: v.optional(v.string()),
    additionalDetails: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_intent", ["intent"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),
  adminSessions: defineTable({
    token: v.string(),
    email: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),
  whiteLabelPartners: defineTable({
    controlTeamId: v.id("teams"),
    name: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    status: whiteLabelPartnerStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_controlTeamId", ["controlTeamId"])
    .index("by_status", ["status"]),
  whiteLabelPartnerAccess: defineTable({
    partnerId: v.id("whiteLabelPartners"),
    workosUserId: v.string(),
    role: v.literal("owner"),
    status: whiteLabelPartnerAccessStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_workosUserId", ["workosUserId"])
    .index("by_partnerId_and_workosUserId", ["partnerId", "workosUserId"]),
  whiteLabelPartnerOrganizations: defineTable({
    partnerId: v.id("whiteLabelPartners"),
    teamId: v.id("teams"),
    status: whiteLabelOrganizationStatusValidator,
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partnerId_and_status", ["partnerId", "status"])
    .index("by_teamId", ["teamId"])
    .index("by_partnerId_and_teamId", ["partnerId", "teamId"]),
  whiteLabelPartnerOrganizationPlans: defineTable({
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    activePlanKey: whiteLabelPlanKeyValidator,
    creditPlanKey: whiteLabelPlanKeyValidator,
    pendingCreditPlanKey: v.optional(whiteLabelPlanKeyValidator),
    pendingCreditPlanEffectiveAt: v.optional(v.number()),
    updatedByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_partnerOrganizationId", ["partnerOrganizationId"]),
  whiteLabelPartnerOrganizationPlanAssignments: defineTable({
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    planKey: whiteLabelPlanKeyValidator,
    appliesAt: v.number(),
    assignedByUserId: v.id("users"),
    createdAt: v.number(),
  }).index("by_partnerOrganizationId_and_createdAt", ["partnerOrganizationId", "createdAt"]),
  whiteLabelPartnerOrganizationCreditPeriods: defineTable({
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    planKey: whiteLabelPlanKeyValidator,
    periodStart: v.number(),
    periodEnd: v.number(),
    grantedCredits: v.number(),
    usedCredits: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_partnerOrganizationId_and_periodStart", ["partnerOrganizationId", "periodStart"]),
  whiteLabelPartnerOrganizationCreditGrants: defineTable({
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    grantedCredits: v.number(),
    usedCredits: v.number(),
    grantedByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_partnerOrganizationId_and_createdAt", ["partnerOrganizationId", "createdAt"]),
  whiteLabelPartnerOrganizationCreditBalances: defineTable({
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    manualGrantedCredits: v.number(),
    manualUsedCredits: v.number(),
    grantCount: v.number(),
    lastGrantAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_partnerOrganizationId", ["partnerOrganizationId"]),
  whiteLabelPartnerOrganizationCreditLedger: defineTable({
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    event: whiteLabelCreditLedgerEventValidator,
    credits: v.number(),
    actorUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_partnerOrganizationId_and_createdAt", ["partnerOrganizationId", "createdAt"]),
  whiteLabelPartnerDomains: defineTable({
    partnerId: v.id("whiteLabelPartners"),
    hostname: v.string(),
    cloudflareHostnameId: v.optional(v.string()),
    dnsTarget: v.optional(v.string()),
    status: whiteLabelDomainStatusValidator,
    validationError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_hostname", ["hostname"]),
  whiteLabelPartnerUsageTotals: defineTable({
    partnerId: v.id("whiteLabelPartners"),
    totalTokens: v.number(),
    totalCostUsd: v.number(),
    requestCount: v.number(),
    updatedAt: v.number(),
  }).index("by_partnerId", ["partnerId"]),
  agents: defineTable({
    name: v.string(),
    provider: v.union(
      v.literal("google"),
      v.literal("openrouter"),
      v.literal("ilmu"),
    ),
    model: v.string(),
    systemPrompt: v.string(),
    templateKey: v.union(
      v.literal("blank"),
      v.literal("sales"),
      v.literal("productSales"),
      v.literal("support"),
    ),
    businessName: v.optional(v.string()),
    businessDescription: v.optional(v.string()),
    goal: v.optional(
      v.union(v.literal("support"), v.literal("bookService")),
    ),
    websiteUrls: v.optional(v.array(v.string())),
    contacts: v.optional(v.string()),
    fileSize: v.number(),
    userId: v.string(),
    orgId: v.string(),
    escalationEnabled: v.optional(v.boolean()),
    escalationMessage: v.optional(v.string()),
    responseLength: v.optional(v.union(v.literal("brief"), v.literal("standard"), v.literal("detailed"))),
    emojiUse: v.optional(v.union(v.literal("never"), v.literal("occasional"), v.literal("frequent"))),
    formality: v.optional(v.union(v.literal("casual"), v.literal("conversational"), v.literal("professional"))),
    humorLevel: v.optional(v.union(v.literal("none"), v.literal("light"), v.literal("playful"))),
    telegramNotificationKinds: v.optional(telegramNotificationKindsValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
  workflows: defineTable({
    agentId: v.id("agents"),
    orgId: v.string(),
    userId: v.string(),
    name: v.string(),
    layoutOrientation: v.optional(workflowLayoutOrientationValidator),
    reminderAutomation: v.optional(workflowReminderAutomationConfigValidator),
    followUpAutomation: v.optional(workflowFollowUpAutomationConfigValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
  workflowAutomationRuns: workflowAutomationRunsTable,
  workflowAutomationCostTotals: workflowAutomationCostTotalsTable,
  workflowAutomationOperations: workflowAutomationOperationsTable,
  workflowFollowUpTimers: workflowFollowUpTimersTable,
  workflowTemplateUsage: workflowTemplateUsageTable,
  workflowTemplateUsageTotals: workflowTemplateUsageTotalsTable,
  workflowNodes: defineTable({
    workflowId: v.id("workflows"),
    kind: workflowNodeKindValidator,
    title: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    allowedAppointmentServiceIds: v.optional(v.array(v.id("appointmentServices"))),
    isReady: v.optional(v.boolean()),
    readinessIssueCount: v.optional(v.number()),
    positionX: v.number(),
    positionY: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workflowId", ["workflowId"]),
  workflowEdges: defineTable({
    workflowId: v.id("workflows"),
    sourceNodeId: v.id("workflowNodes"),
    targetNodeId: v.id("workflowNodes"),
    label: v.optional(v.string()),
    detail: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workflowId", ["workflowId"])
    .index("by_workflowId_and_sourceNodeId", ["workflowId", "sourceNodeId"])
    .index("by_workflowId_and_targetNodeId", ["workflowId", "targetNodeId"]),
  textEntries: defineTable({
    agentId: v.id("agents"),
    title: v.string(),
    content: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"])
    .index("by_orgId", ["orgId"]),
  fileEntries: defineTable({
    agentId: v.id("agents"),
    title: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"])
    .index("by_orgId", ["orgId"]),
  webEntries: defineTable({
    agentId: v.id("agents"),
    url: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("gettingLinks"),
      v.literal("linksObtained"),
      v.literal("gettingMarkdown"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    parentUrl: v.optional(v.string()),
    parentId: v.optional(v.id("webEntries")),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"])
    .index("by_orgId", ["orgId"]),
  qaEntries: defineTable({
    agentId: v.id("agents"),
    question: v.string(),
    answer: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"])
    .index("by_orgId", ["orgId"]),
  // Per-org Meta connection. wabaId/phoneNumberId/accessToken are optional so a
  // row can exist before signup completes (status: "pending") and so future
  // Instagram/Messenger rows can live in the same table.
  channels: defineTable({
    orgId: v.string(),
    service: serviceValidator,
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    displayPhoneNumber: v.optional(v.string()),
    igUserId: v.optional(v.string()),
    pageId: v.optional(v.string()),
    // Facebook user id of the person who completed the Messenger connect.
    // Meta deliver Deauthorize / Data Deletion callbacks at the FB-user
    // level (not the Page level), so we need this to resolve which channel
    // row(s) to disconnect when those callbacks fire.
    fbUserId: v.optional(v.string()),
    displayUsername: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error"),
    ),
    progressStep: v.optional(
      v.union(
        v.literal("linking"),
        v.literal("subscribing"),
        v.literal("registering"),
        v.literal("exchanging"),
        v.literal("backfilling"),
      ),
    ),
    mmLiteTermsSignedAt: v.optional(v.number()),
    partnerAppInstalledAt: v.optional(v.number()),
    coexistenceSyncStartedAt: v.optional(v.number()),
    historySyncPhase: v.optional(v.number()),
    historySyncChunkOrder: v.optional(v.number()),
    historySyncProgress: v.optional(v.number()),
    historySyncCompletedBatchCount: v.optional(v.number()),
    historySyncTotalBatchCount: v.optional(v.number()),
    historySyncStatus: v.optional(whatsappHistorySyncStatusValidator),
    historySyncUpdatedAt: v.optional(v.number()),
    historySyncError: v.optional(v.string()),
    contactSyncStartedAt: v.optional(v.number()),
    contactSyncLastEventAt: v.optional(v.number()),
    contactSyncStatus: v.optional(whatsappContactSyncStatusValidator),
    lastError: v.optional(v.string()),
    connectedByUserId: v.string(),
    defaultAgentId: v.optional(v.id("agents")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_service", ["orgId", "service"])
    .index("by_phoneNumberId", ["phoneNumberId"])
    .index("by_wabaId", ["wabaId"])
    .index("by_igUserId", ["igUserId"])
    .index("by_pageId", ["pageId"])
    .index("by_fbUserId", ["fbUserId"])
    .index("by_defaultAgentId_and_service", ["defaultAgentId", "service"])
    .index("by_connectedByUserId", ["connectedByUserId"]),
  webWidgetSettings: defineTable({
    channelId: v.id("channels"),
    agentId: v.id("agents"),
    orgId: v.string(),
    connectedByUserId: v.string(),
    publicKey: v.string(),
    enabled: v.boolean(),
    agentDisplayName: v.string(),
    placeholder: v.optional(v.string()),
    layout: v.optional(webWidgetLayoutValidator),
    theme: v.optional(webWidgetThemeValidator),
    iconStorageId: v.optional(v.id("_storage")),
    hidePoweredBy: v.optional(v.boolean()),
    mode: v.optional(webWidgetModeValidator),
    traditionalLabel: v.optional(v.string()),
    traditionalPrefillMessage: v.optional(v.string()),
    traditionalMainColor: v.optional(v.string()),
    traditionalIconStorageId: v.optional(v.id("_storage")),
    traditionalHidePoweredBy: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_publicKey", ["publicKey"])
    .index("by_channelId", ["channelId"])
    .index("by_agentId", ["agentId"])
    .index("by_orgId", ["orgId"]),
  avatarConfigurations: defineTable({
    channelId: v.id("channels"),
    agentId: v.id("agents"),
    orgId: v.string(),
    connectedByUserId: v.string(),
    publicKey: v.string(),
    enabled: v.boolean(),
    avatarId: v.optional(v.string()),
    avatarName: v.optional(v.string()),
    avatarPreviewUrl: v.optional(v.string()),
    voiceId: v.optional(v.string()),
    voiceName: v.optional(v.string()),
    voiceLanguage: v.optional(v.string()),
    voiceGender: v.optional(v.string()),
    language: v.string(),
    providerContextId: v.optional(v.string()),
    providerEmbedId: v.optional(v.string()),
    providerEmbedUrl: v.optional(v.string()),
    providerEmbedScript: v.optional(v.string()),
    providerEmbedSandbox: v.optional(v.boolean()),
    embedCreatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_publicKey", ["publicKey"])
    .index("by_channelId", ["channelId"])
    .index("by_agentId", ["agentId"])
    .index("by_orgId", ["orgId"])
    .index("by_connectedByUserId", ["connectedByUserId"]),
  avatarSessions: defineTable({
    configurationId: v.id("avatarConfigurations"),
    sessionId: v.string(),
    visitorId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    isSandbox: v.boolean(),
    status: v.union(v.literal("active"), v.literal("stopped"), v.literal("failed")),
    startedAt: v.number(),
    stoppedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    endReason: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_configurationId_and_startedAt", ["configurationId", "startedAt"]),
  avatarEvents: defineTable({
    sessionId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    sourceEventId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_sessionId_and_createdAt", ["sessionId", "createdAt"]),
  whatsappSyncRequests: defineTable({
    channelId: v.id("channels"),
    orgId: v.string(),
    wabaId: v.optional(v.string()),
    phoneNumberId: v.string(),
    syncType: whatsappSyncTypeValidator,
    requestId: v.optional(v.string()),
    status: whatsappSyncRequestStatusValidator,
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.number()),
    createdAt: v.number(),
    requestedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_requestId", ["requestId"])
    .index("by_channelId_and_syncType", ["channelId", "syncType"])
    .index("by_phoneNumberId", ["phoneNumberId"])
    .index("by_orgId", ["orgId"]),
  whatsappAccountUpdates: defineTable({
    wabaId: v.string(),
    event: v.string(),
    phoneNumber: v.optional(v.string()),
    ownerBusinessId: v.optional(v.string()),
    partnerAppId: v.optional(v.string()),
    eventAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wabaId", ["wabaId"])
    .index("by_wabaId_and_event", ["wabaId", "event"]),
  whatsappConnectionAttempts: defineTable({
    orgId: v.string(),
    connectedByUserId: v.string(),
    agentId: v.optional(v.id("agents")),
    status: whatsappConnectionAttemptStatusValidator,
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    channelId: v.optional(v.id("channels")),
    signupFinishedAt: v.optional(v.number()),
    mmLiteTermsSignedAt: v.optional(v.number()),
    partnerAppInstalledAt: v.optional(v.number()),
    syncStartedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wabaId", ["wabaId"])
    .index("by_channelId", ["channelId"])
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_connectedByUserId_and_status", ["connectedByUserId", "status"])
    .index("by_connectedByUserId", ["connectedByUserId"]),
  whatsappHistorySyncBatches: defineTable({
    channelId: v.id("channels"),
    orgId: v.string(),
    phoneNumberId: v.string(),
    phase: v.optional(v.number()),
    chunkOrder: v.optional(v.number()),
    progress: v.optional(v.number()),
    status: whatsappStagingSyncStatusValidator,
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_channelId_and_status", ["channelId", "status"])
    .index("by_channelId_and_phase_and_chunkOrder", [
      "channelId",
      "phase",
      "chunkOrder",
    ])
    .index("by_orgId", ["orgId"]),
  whatsappHistoryIngestThreads: defineTable({
    batchId: v.id("whatsappHistorySyncBatches"),
    channelId: v.id("channels"),
    orgId: v.string(),
    phoneNumberId: v.string(),
    whatsappThreadId: v.string(),
    contactAddress: v.string(),
    status: whatsappStagingSyncStatusValidator,
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_batchId_and_status", ["batchId", "status"])
    .index("by_batchId_and_whatsappThreadId", [
      "batchId",
      "whatsappThreadId",
    ])
    .index("by_channelId_and_status", ["channelId", "status"])
    .index("by_channelId_and_whatsappThreadId", [
      "channelId",
      "whatsappThreadId",
    ])
    .index("by_orgId", ["orgId"]),
  whatsappHistoryIngestMessages: defineTable({
    channelId: v.id("channels"),
    orgId: v.string(),
    batchId: v.id("whatsappHistorySyncBatches"),
    ingestThreadId: v.id("whatsappHistoryIngestThreads"),
    externalId: v.string(),
    whatsappThreadId: v.string(),
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
    content: v.string(),
    contentType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("audio"),
      v.literal("video"),
      v.literal("document"),
      v.literal("file"),
    ),
    timestampMs: v.number(),
    rawType: v.optional(v.string()),
    historyStatus: v.optional(
      v.union(
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("read"),
        v.literal("failed"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ingestThreadId_and_timestampMs", [
      "ingestThreadId",
      "timestampMs",
    ])
    .index("by_channelId_and_externalId", ["channelId", "externalId"])
    .index("by_channelId_and_whatsappThreadId_and_timestampMs", [
      "channelId",
      "whatsappThreadId",
      "timestampMs",
    ])
    .index("by_orgId", ["orgId"]),
  // A customer is anyone who messaged the org via any channel, or who was
  // added manually. Natural key is (orgId, service, contactAddress).
  customers: defineTable({
    orgId: v.string(),
    /** Owner's WorkOS user id (personal workspaces) or channel connector (team). */
    userId: v.optional(v.string()),
    /** Agent this contact is segregated to (from the channel's defaultAgentId). */
    agentId: v.optional(v.id("agents")),
    service: customerServiceValidator,
    contactAddress: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    searchText: v.optional(v.string()),
    tags: v.array(v.string()),
    leadTemperature: v.optional(
      v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold"))
    ),
    notes: v.optional(v.string()),
    source: customerServiceValidator,
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastConversationId: v.optional(v.id("conversations")),
    followUpPending: v.optional(v.boolean()),
    followUpAttempt: v.optional(v.number()),
    followUpPendingRuleId: v.optional(v.id("followUpRules")),
    followUpScheduledAt: v.optional(v.number()),
    customFields: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_lastSeenAt", ["orgId", "lastSeenAt"])
    .searchIndex("search_searchText", {
      searchField: "searchText",
      filterFields: ["orgId"],
    })
    .index("by_orgId_and_service_and_contactAddress", [
      "orgId",
      "service",
      "contactAddress",
    ])
    .index("by_userId_and_agentId_and_lastSeenAt", [
      "userId",
      "agentId",
      "lastSeenAt",
    ])
    .index("by_orgId_and_agentId_and_lastSeenAt", [
      "orgId",
      "agentId",
      "lastSeenAt",
    ]),
  // Unified conversation table. service: "playground" rows are AI-playground
  // threads; the rest are channel-backed inbox conversations.
  conversations: defineTable({
    orgId: v.string(),
    /** Owner's WorkOS user id. For personal workspaces (orgId = ""), this
     *  scopes the conversation to its owner; for team workspaces it records
     *  the channel connector and queries still use orgId. */
    userId: v.optional(v.string()),
    channelId: v.optional(v.id("channels")),
    service: conversationServiceValidator,
    orgAddress: v.string(),
    contactAddress: v.string(),
    contactName: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    status: v.union(
      v.literal("open"),
      v.literal("snoozed"),
      v.literal("closed"),
      v.literal("booked"),
      v.literal("requires_user_input"),
    ),
    escalation: v.optional(
      v.object({
        question: v.string(),
        context: v.string(),
        escalatedAt: v.number(),
        sourceMessageId: v.optional(v.id("messages")),
      })
    ),
    tags: v.optional(v.array(v.string())),
    assignedAgentId: v.optional(v.id("agents")),
    assignedUserId: v.optional(v.string()),
    assignToAiAgent: v.boolean(),
    leadAssignmentFallback: v.optional(v.boolean()),
    metaConversationId: v.optional(v.string()),
    threadId: v.string(),
    lastMessageAt: v.number(),
    /** Last inbound (customer) message time — used for Meta messaging window checks. */
    lastCustomerMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    unreadCount: v.number(),
    /** Set after AI lead labeling runs during initial Meta conversation sync. */
    syncLeadLabeledAt: v.optional(v.number()),
    /** Overall customer sentiment from the latest AI sentiment analysis run. */
    customerSentiment: v.optional(customerSentimentValidator),
    sentimentAnalyzedAt: v.optional(v.number()),
    sentimentSourceMessageMaxCreatedAt: v.optional(v.number()),
    advancedAnalyticsAnalyzedAt: v.optional(v.number()),
    advancedAnalyticsSourceMessageMaxCreatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_lastMessageAt", ["orgId", "lastMessageAt"])
    .index("by_userId_and_lastMessageAt", ["userId", "lastMessageAt"])
    .index("by_orgId_and_assignedAgentId_and_lastMessageAt", [
      "orgId",
      "assignedAgentId",
      "lastMessageAt",
    ])
    .index("by_userId_and_assignedAgentId_and_lastMessageAt", [
      "userId",
      "assignedAgentId",
      "lastMessageAt",
    ])
    .index("by_lastMessageAt", ["lastMessageAt"])
    .index("by_channel_and_contactAddress", ["channelId", "contactAddress"])
    .index("by_threadId", ["threadId"])
    .index("by_customerId", ["customerId"])
    .index("by_orgId_and_service_and_assignedAgentId_and_assignedUserId", [
      "orgId",
      "service",
      "assignedAgentId",
      "assignedUserId",
    ]),
  inboundMediaBatches: defineTable({
    conversationId: v.id("conversations"),
    agentId: v.id("agents"),
    state: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
    ),
    revision: v.number(),
    firstItemAt: v.number(),
    latestItemAt: v.number(),
    processAfter: v.number(),
    latestPromptMessageId: v.string(),
    latestExternalId: v.string(),
    workId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversationId_and_state", ["conversationId", "state"])
    .index("by_conversationId", ["conversationId"])
    .index("by_updatedAt", ["updatedAt"]),
  inboundMediaBatchItems: defineTable({
    batchId: v.id("inboundMediaBatches"),
    conversationId: v.id("conversations"),
    assetKey: v.string(),
    externalId: v.string(),
    promptMessageId: v.string(),
    ordinal: v.number(),
    kind: v.union(v.literal("image"), v.literal("audio")),
    service: v.union(
      v.literal("whatsapp"),
      v.literal("instagram"),
      v.literal("messenger"),
    ),
    providerMediaId: v.optional(v.string()),
    providerUrl: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    caption: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_batchId_and_ordinal", ["batchId", "ordinal"])
    .index("by_batchId", ["batchId"])
    .index("by_assetKey", ["assetKey"]),
  messages: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    channelId: v.optional(v.id("channels")),
    service: conversationServiceValidator,
    externalId: v.optional(v.string()),
    orgAddress: v.string(),
    contactAddress: v.string(),
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
    agentId: v.optional(v.id("agents")),
    authorUserId: v.optional(v.string()),
    contentType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("audio"),
      v.literal("file"),
      v.literal("video"),
      v.literal("document"),
      v.literal("unknown"),
    ),
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    messageKind: v.optional(messageKindValidator),
    broadcastPresentation: v.optional(broadcastPresentationValidator),
    workflowAutomationSource: v.optional(v.union(
      v.literal("workflowReminder"),
      v.literal("workflowFollowUp"),
    )),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("read"),
        v.literal("failed"),
      ),
    ),
    statusUpdatedAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    receiptMetadata: v.optional(
      v.object({
        source: v.union(
          v.literal("whatsapp_status"),
          v.literal("instagram_seen"),
          v.literal("messenger_read"),
        ),
        providerMessageId: v.optional(v.string()),
        providerTimestamp: v.optional(v.number()),
        watermark: v.optional(v.number()),
      }),
    ),
    failureReason: v.optional(v.string()),
    agentMessageId: v.optional(v.string()),
    sourceEventId: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    creditsCharged: v.optional(v.number()),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          source: v.union(
            v.literal("customer"),
            v.literal("human"),
            v.literal("ai"),
          ),
          actorKey: v.string(),
          actorUserId: v.optional(v.string()),
          actorAgentId: v.optional(v.id("agents")),
          actorName: v.optional(v.string()),
          externalReactionMessageId: v.optional(v.string()),
          createdAt: v.number(),
          updatedAt: v.number(),
        }),
      ),
    ),
    createdAt: v.number(),
  })
    .index("by_conversationId_and_createdAt", ["conversationId", "createdAt"])
    .index("by_agentId_and_createdAt", ["agentId", "createdAt"])
    .index("by_agentMessageId", ["agentMessageId"])
    .index("by_externalId", ["externalId"])
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"]),
  agentOverviewDailyConversationFacts: defineTable({
    agentId: v.id("agents"),
    conversationId: v.id("conversations"),
    orgId: v.string(),
    timeZone: v.string(),
    date: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId_and_timeZone_and_date", [
      "agentId",
      "timeZone",
      "date",
    ])
    .index("by_agentId_and_conversationId_and_timeZone_and_date", [
      "agentId",
      "conversationId",
      "timeZone",
      "date",
    ])
    .index("by_orgId", ["orgId"]),
  agentOverviewHumanEscalationFacts: defineTable({
    agentId: v.id("agents"),
    conversationId: v.id("conversations"),
    conversationLogId: v.optional(v.id("conversationLogs")),
    orgId: v.string(),
    timeZone: v.string(),
    date: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId_and_timeZone_and_date", [
      "agentId",
      "timeZone",
      "date",
    ])
    .index("by_conversationLogId", ["conversationLogId"])
    .index("by_orgId", ["orgId"]),
  conversationAnalyticsFacts: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    service: conversationServiceValidator,
    channelId: v.optional(v.id("channels")),
    assignedUserId: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    firstCustomerMessageAt: v.optional(v.number()),
    firstOutgoingAt: v.optional(v.number()),
    firstHumanOutgoingAt: v.optional(v.number()),
    conversionDurationMs: v.optional(v.number()),
    firstReplyDurationMs: v.optional(v.number()),
    firstHumanReplyDurationMs: v.optional(v.number()),
    incomingMessageCount: v.number(),
    outgoingMessageCount: v.number(),
    humanMessageCount: v.number(),
    aiMessageCount: v.number(),
    convertedAt: v.optional(v.number()),
    droppedAt: v.optional(v.number()),
    topicId: v.optional(v.id("conversationTopics")),
    sourceMessageMaxCreatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_orgId_and_updatedAt", ["orgId", "updatedAt"])
    .index("by_orgId_and_conversationId", ["orgId", "conversationId"]),
  conversationAnalyticsRefreshRequests: defineTable({
    conversationId: v.id("conversations"),
    revision: v.number(),
    requestedAt: v.number(),
  }).index("by_conversationId", ["conversationId"]),
  conversationAnalyticsDirtyRequests: defineTable({
    conversationId: v.id("conversations"),
    revision: v.number(),
    requestedAt: v.number(),
    nextAttemptAt: v.number(),
    earliestDirtyMessageAt: v.optional(v.number()),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_nextAttemptAt", ["nextAttemptAt"]),
  conversationAnalyticsProjectionStates: defineTable({
    conversationId: v.id("conversations"),
    firstCustomerMessageAt: v.optional(v.number()),
    firstOutgoingAt: v.optional(v.number()),
    firstHumanOutgoingAt: v.optional(v.number()),
    firstHumanMessageId: v.optional(v.id("messages")),
    firstHumanMemberUserId: v.optional(v.string()),
    convertedAt: v.optional(v.number()),
    droppedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_conversationId", ["conversationId"]),
  analyticsMetricEntries: defineTable({
    namespace: v.string(),
    sortKey: v.number(),
    value: v.number(),
    metric: analyticsMetricValidator,
    orgId: v.string(),
    memberUserId: v.optional(v.string()),
    service: v.optional(conversationServiceValidator),
    channelId: v.optional(v.id("channels")),
    topicId: v.optional(v.id("conversationTopics")),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
    sourceKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sourceKey", ["sourceKey"])
    .index("by_sourceConversationId", ["sourceConversationId"])
    .index("by_sourceConversationId_and_sourceKey", [
      "sourceConversationId",
      "sourceKey",
    ])
    .index("by_sourceConversationId_and_metric_and_sourceKey", [
      "sourceConversationId",
      "metric",
      "sourceKey",
    ])
    .index("by_orgId_and_metric_and_sortKey", ["orgId", "metric", "sortKey"]),
  conversationTopics: defineTable({
    orgId: v.string(),
    name: v.string(),
    slug: v.string(),
    aliases: v.optional(v.array(v.string())),
    totalCount: v.number(),
    weekCount: v.number(),
    lastSeenAt: v.number(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_slug", ["orgId", "slug"])
    .index("by_orgId_and_totalCount", ["orgId", "totalCount"])
    .index("by_orgId_and_weekCount", ["orgId", "weekCount"]),
  conversationTopicAssignments: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    topicId: v.id("conversationTopics"),
    confidence: v.number(),
    summary: v.optional(v.string()),
    rank: v.optional(v.number()),
    detectedAt: v.number(),
    sourceMessageMaxCreatedAt: v.optional(v.number()),
    customerSentiment: v.optional(customerSentimentValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_and_topicId", ["conversationId", "topicId"])
    .index("by_orgId_and_detectedAt", ["orgId", "detectedAt"])
    .index("by_topicId", ["topicId"]),
  // Short-lived one-time sessions used to tie a third-party OAuth callback
  // (e.g. Instagram) back to the authenticated user/org that started it.
  // The row is created when the user clicks "Connect" and consumed once the
  // OAuth provider redirects to our static callback. `csrf` is the random
  // token also embedded in the OAuth `state` parameter; presence of a row
  // with a matching csrf is what proves the callback corresponds to a flow
  // we initiated. `consumed` flips to true after a successful callback so a
  // replayed `state` cannot upsert a second channel row.
  // Primarily used by Instagram (full-page redirect → /auth/instagram/callback)
  // and Messenger (`dialog/oauth` → /auth/messenger/callback). `service`
  // distinguishes rows; both flows use the same session + CSRF pattern.
  oauthSessions: defineTable({
    csrf: v.string(),
    service: v.union(v.literal("instagram"), v.literal("messenger")),
    orgId: v.string(),
    userId: v.string(),
    returnPath: v.string(),
    expiresAt: v.number(),
    consumed: v.boolean(),
    // Messenger OAuth redirect flow: when the user owns multiple Pages we
    // stash the user access token between the callback and the in-app
    // Page picker (authorization codes are single-use).
    pendingUserAccessToken: v.optional(v.string()),
  })
    .index("by_csrf", ["csrf"])
    .index("by_orgId", ["orgId"]),
  mediaUploads: defineTable({
    clientId: v.string(),
    orgId: v.string(),
    userId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("uploading"),
      v.literal("ready"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("deleting"),
    ),
    r2Key: v.optional(v.string()),
    publicUrl: v.optional(v.string()),
    mediaType: v.string(),
    filename: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    purpose: v.optional(v.union(
      v.literal(MediaUploadPurpose.KnowledgeBase),
      v.literal(MediaUploadPurpose.WorkflowSendMedia),
    )),
    agentId: v.optional(v.id("agents")),
    workflowNodeId: v.optional(v.id("workflowNodes")),
    collectionName: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_orgId_userId_clientId", ["orgId", "userId", "clientId"])
    .index("by_orgId_userId", ["orgId", "userId"])
    .index("by_orgId", ["orgId"])
    .index("by_agentId", ["agentId"])
    .index("by_workflowNodeId", ["workflowNodeId"]),
  // One row per billing user per monthly credit cycle. Source of truth for the
  // monthly credit quota: remaining = grantedCredits - usedCredits.
  // `periodEnd` is the next reset moment (shown in the plan UI). Cycles are
  // monthly, anchored to the user's creation day-of-month, independent of the
  // Stripe payment interval (so annual plans still reset monthly).
  // The quota belongs to the billing user (owner); multiple teams share it.
  userCreditPeriods: defineTable({
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    grantedCredits: v.number(),
    usedCredits: v.number(),
    planKey: v.optional(
      v.union(
        v.literal("free"),
        v.literal("starter"),
        v.literal("growth"),
        v.literal("business"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId_and_periodStart", ["userId", "periodStart"])
    .index("by_userId_and_periodEnd", ["userId", "periodEnd"])
    .index("by_periodEnd", ["periodEnd"]),

  // One row per top-up purchase. Carries forward across billing cycles (no
  // reset). Mirrors userCreditPeriods: remaining = grantedCredits - usedCredits.
  // Deducted FIFO by createdAt after the monthly quota is exhausted.
  // Belongs to the billing user; multiple teams share the same quota.
  // Old fields (orgId/userId/amount/balance) are kept optional so legacy rows
  // validate until migrated; new code reads grantedCredits/usedCredits.
  topUpEntries: defineTable({
    userId: v.optional(v.id("users")),
    source: v.optional(
      v.union(
        v.literal("purchase"),
        v.literal("referral"),
        v.literal("manual"),
      ),
    ),
    grantedCredits: v.optional(v.number()),
    usedCredits: v.optional(v.number()),
    label: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    /** @deprecated legacy scope field, use userId */
    orgId: v.optional(v.string()),
    /** @deprecated migrated to userId (was already userId in legacy) */
    amount: v.optional(v.number()),
    /** @deprecated migrated to grantedCredits - usedCredits */
    balance: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),
  referralCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),
    successfulReferralCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_code", ["code"]),
  referralRedemptions: defineTable({
    referralCodeId: v.id("referralCodes"),
    referrerUserId: v.id("users"),
    referredUserId: v.id("users"),
    rewardCredits: v.number(),
    referrerTopUpEntryId: v.id("topUpEntries"),
    referredTopUpEntryId: v.id("topUpEntries"),
    completedAt: v.number(),
  })
    .index("by_referredUserId", ["referredUserId"])
    .index("by_referrerUserId_and_completedAt", [
      "referrerUserId",
      "completedAt",
    ]),
  creditLogs: defineTable({
    teamId: v.optional(v.id("teams")),
    orgId: v.string(),
    userId: v.optional(v.id("users")),
    amount: v.number(),
    type: v.union(
      v.literal("deduction"),
      v.literal("top_up"),
      v.literal("grant")
    ),
    eventType: v.optional(
      v.union(
        v.literal("monthly_reset"),
        v.literal("usage"),
        v.literal("top_up"),
        v.literal("grant"),
        v.literal("adjustment"),
      ),
    ),
    label: v.optional(v.string()),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    monthlyCreditsBefore: v.optional(v.number()),
    monthlyCreditsAfter: v.optional(v.number()),
    purchasedCreditsBefore: v.optional(v.number()),
    purchasedCreditsAfter: v.optional(v.number()),
    creditCost: v.optional(v.number()),
    modelId: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    reason: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    periodId: v.optional(v.id("userCreditPeriods")),
    /** @deprecated migrated to periodId */
    creditPeriodId: v.optional(v.string()),
    topUpEntryId: v.optional(v.id("topUpEntries")),
    deductionSource: v.optional(
      v.union(v.literal("monthly"), v.literal("top_up")),
    ),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"])
    .index("by_teamId_and_createdAt", ["teamId", "createdAt"])
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_userId_and_eventType_and_createdAt", [
      "userId",
      "eventType",
      "createdAt",
    ])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),
  creditUsageEvents: defineTable({
    userId: v.id("users"),
    orgId: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    modelId: v.optional(v.string()),
    credits: v.number(),
    conversationId: v.optional(v.id("conversations")),
    creditLogId: v.id("creditLogs"),
    createdAt: v.number(),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_agentId_and_createdAt", ["agentId", "createdAt"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"])
    .index("by_creditLogId", ["creditLogId"]),
  processedStripePayments: defineTable({
    stripePaymentIntentId: v.string(),
    orgId: v.string(),
    creditsGranted: v.number(),
    processedAt: v.number(),
  }).index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),
  leadAssignmentSettings: defineTable({
    agentId: v.id("agents"),
    method: v.union(
      v.literal("balanced"),
      v.literal("round_robin"),
      v.literal("priority"),
      v.literal("tags"),
      v.literal("manual"),
    ),
    aiEnabledOnInbound: v.boolean(),
    aiWhenOutsideSchedule: v.optional(v.boolean()),
    tagRules: v.optional(
      v.array(
        v.object({
          tag: v.string(),
          workosUserId: v.string(),
        }),
      ),
    ),
    lastAssignedWorkosUserId: v.optional(v.string()),
    lastAssignedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_agentId", ["agentId"]),
  userSchedules: defineTable({
    agentId: v.id("agents"),
    workosUserId: v.string(),
    mode: v.union(v.literal("manual"), v.literal("scheduled")),
    manualStatus: v.union(v.literal("available"), v.literal("away")),
    timezone: v.string(),
    enabled: v.boolean(),
    assignmentPriority: v.optional(v.number()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_agentId_and_workosUserId", ["agentId", "workosUserId"]),
  userShifts: defineTable({
    userScheduleId: v.id("userSchedules"),
    dayOfWeek: v.number(),
    startMinutes: v.number(),
    endMinutes: v.number(),
  }).index("by_userScheduleId", ["userScheduleId"]),
  userTimeOff: defineTable({
    userScheduleId: v.id("userSchedules"),
    startAt: v.number(),
    endAt: v.number(),
    label: v.optional(v.string()),
  }).index("by_userScheduleId", ["userScheduleId"]),
  appointmentServices: defineTable({
    agentId: v.id("agents"),
    name: v.string(),
    description: v.optional(v.string()),
    locationMode: v.optional(v.union(
      v.literal("remote"),
      v.literal("video_call"),
      v.literal("in_person"),
    )),
    location: v.optional(v.string()),
    isActive: v.boolean(),
    archivedAt: v.optional(v.number()),
    sortOrder: v.number(),
    durationMinutes: v.number(),
    bufferMinutes: v.optional(v.number()),
    timeZone: v.optional(v.string()),
    fields: v.array(appointmentServiceFieldValidator),
    timeSlotPolicy: appointmentTimeSlotPolicyValidator,
    preferredTimeMinutes: v.optional(v.array(v.number())),
    salesStyle: appointmentSalesStyleValidator,
    assignmentStrategy: appointmentAssignmentStrategyValidator,
    specificWorkosUserId: v.optional(v.string()),
    assignedWorkosUserIds: v.optional(v.array(v.string())),
    lastAssignedWorkosUserId: v.optional(v.string()),
    lastAssignedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agentId_and_sortOrder", ["agentId", "sortOrder"])
    .index("by_agentId_and_isActive", ["agentId", "isActive"]),
  appointmentBookingSessions: defineTable({
    conversationId: v.optional(v.id("conversations")),
    customerId: v.optional(v.id("customers")),
    agentId: v.id("agents"),
    serviceId: v.optional(v.id("appointmentServices")),
    status: appointmentBookingSessionStatusValidator,
    collectedFields: v.record(v.string(), appointmentCollectedValueValidator),
    proposedSlots: v.optional(v.array(appointmentBookingSlotValidator)),
    selectedSlot: v.optional(appointmentBookingSlotValidator),
    calendarEventId: v.optional(v.id("calendarEvents")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_calendarEventId", ["calendarEventId"])
    .index("by_agentId_and_updatedAt", ["agentId", "updatedAt"]),
  telegramNotificationRecipients: defineTable({
    phoneDigits: v.string(),
    status: telegramRecipientStatusValidator,
    verificationTokenHash: v.optional(v.string()),
    verificationChatId: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    telegramUserId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    nextTelegramMessageAt: v.optional(v.number()),
    nextTelegramMessageAvailableAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phoneDigits", ["phoneDigits"])
    .index("by_verificationTokenHash", ["verificationTokenHash"])
    .index("by_verificationChatId_and_updatedAt", ["verificationChatId", "updatedAt"])
    .index("by_telegramChatId", ["telegramChatId"])
    .index("by_telegramUserId", ["telegramUserId"]),
  agentTelegramNotificationSubscriptions: defineTable({
    agentId: v.id("agents"),
    recipientId: v.id("telegramNotificationRecipients"),
    status: telegramSubscriptionStatusValidator,
    lastTestSentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_agentId_and_status", ["agentId", "status"])
    .index("by_agentId_and_recipientId", ["agentId", "recipientId"])
    .index("by_recipientId", ["recipientId"]),
  quickReplies: defineTable({
    teamId: v.id("teams"),
    title: v.string(),
    text: v.string(),
    r2Key: v.optional(v.string()),
    r2Keys: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_teamId", ["teamId"]),
  calendarEvents: defineTable({
    teamId: v.id("teams"),
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    link: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
    timeZone: v.string(),
    allDay: v.optional(v.boolean()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.union(
      v.literal("confirmed"),
      v.literal("tentative"),
      v.literal("cancelled"),
    ),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
    externalProvider: v.optional(v.literal("google")),
    externalCalendarId: v.optional(v.string()),
    externalEventId: v.optional(v.string()),
    externalICalUID: v.optional(v.string()),
    externalEtag: v.optional(v.string()),
    externalHtmlLink: v.optional(v.string()),
    externalUpdatedAt: v.optional(v.number()),
    ...googleCalendarExternalEventFields,
    agentId: v.optional(v.id("agents")),
    conversationId: v.optional(v.id("conversations")),
    appointmentServiceId: v.optional(v.id("appointmentServices")),
    bookingSource: v.optional(v.union(v.literal("manual"), v.literal("ai"))),
    customFieldResponses: v.optional(v.record(v.string(), appointmentCollectedValueValidator)),
    remarks: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_teamId_and_startAt", ["teamId", "startAt"])
    .index("by_agentId_and_startAt", ["agentId", "startAt"])
    .index("by_agentId_and_bookingSource_and_startAt", [
      "agentId",
      "bookingSource",
      "startAt",
    ])
    .index("by_agentId_and_bookingSource_and_createdAt", [
      "agentId",
      "bookingSource",
      "createdAt",
    ])
    .index("by_teamId_and_externalProvider_and_externalEventId", [
      "teamId",
      "externalProvider",
      "externalEventId",
    ])
    .index(GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX, [
      "teamId",
      "externalOwnerUserId",
      "externalCalendarId",
      "externalEventId",
      "externalOriginalStartAt",
    ])
    .index("by_externalOwnerUserId_and_externalOrigin", [
      "externalOwnerUserId",
      "externalOrigin",
    ]),
  ...googleCalendarTables,
  calendarEventParticipants: defineTable({
    eventId: v.id("calendarEvents"),
    teamId: v.id("teams"),
    participantType: v.union(v.literal("teamUser"), v.literal("customer")),
    role: v.union(
      v.literal("assigned"),
      v.literal("customer"),
      v.literal("attendee"),
    ),
    userId: v.optional(v.id("users")),
    customerId: v.optional(v.id("customers")),
    email: v.string(),
    displayName: v.optional(v.string()),
    eventStartAt: v.number(),
    eventEndAt: v.optional(v.number()),
    availabilityIndexedAt: v.optional(v.number()),
    responseStatus: v.optional(
      v.union(
        v.literal("needsAction"),
        v.literal("declined"),
        v.literal("tentative"),
        v.literal("accepted"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_teamId_and_userId_and_eventStartAt", [
      "teamId",
      "userId",
      "eventStartAt",
    ])
    .index("by_teamId_and_customerId_and_eventStartAt", [
      "teamId",
      "customerId",
      "eventStartAt",
    ])
    .index("by_teamId_and_role_and_userId_and_eventStartAt", [
      "teamId",
      "role",
      "userId",
      "eventStartAt",
    ])
    .index("by_teamId_and_role_and_userId_and_eventEndAt", [
      "teamId",
      "role",
      "userId",
      "eventEndAt",
    ])
    .index("by_teamId_and_role_and_userId_and_availabilityIndexedAt", [
      "teamId",
      "role",
      "userId",
      "availabilityIndexedAt",
    ])
    .index("by_teamId_and_role_and_customerId_and_eventStartAt", [
      "teamId",
      "role",
      "customerId",
      "eventStartAt",
    ]),
  calendarAvailabilityIntervals: defineTable({
    participantId: v.id("calendarEventParticipants"),
    eventId: v.id("calendarEvents"),
    teamId: v.id("teams"),
    userId: v.id("users"),
    bucketKind: v.union(v.literal("day"), v.literal("month"), v.literal("long")),
    bucketKey: v.string(),
    startAt: v.number(),
    endAt: v.number(),
    externalOwnerUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_participantId", ["participantId"])
    .index("by_teamId_and_userId_and_bucketKind_and_bucketKey_and_startAt", [
      "teamId",
      "userId",
      "bucketKind",
      "bucketKey",
      "startAt",
    ])
    .index("by_teamId_and_userId_and_bucketKind_and_bucketKey_and_endAt", [
      "teamId",
      "userId",
      "bucketKind",
      "bucketKey",
      "endAt",
    ]),
  calendarAvailabilityRevisions: defineTable({
    teamId: v.id("teams"),
    revision: v.number(),
    updatedAt: v.number(),
  }).index("by_teamId", ["teamId"]),
  calendarAvailabilityPreloads: defineTable({
    teamId: v.id("teams"),
    agentId: v.id("agents"),
    windowStartAt: v.number(),
    windowEndAt: v.number(),
    userIds: v.array(v.id("users")),
    state: v.union(v.literal("pending"), v.literal("ready")),
    phase: v.union(v.literal("cleanup"), v.literal("repair"), v.literal("load")),
    generation: v.number(),
    nextUserIndex: v.number(),
    revision: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_teamId_and_agentId_and_windowStartAt_and_windowEndAt", [
    "teamId",
    "agentId",
    "windowStartAt",
    "windowEndAt",
  ]),
  calendarAvailabilityPreloadUsers: defineTable({
    preloadId: v.id("calendarAvailabilityPreloads"),
    teamId: v.id("teams"),
    userId: v.id("users"),
    generation: v.number(),
    safe: v.boolean(),
    intervals: v.array(v.object({
      eventId: v.id("calendarEvents"),
      startAt: v.number(),
      endAt: v.number(),
      externalOwnerUserId: v.optional(v.id("users")),
    })),
    updatedAt: v.number(),
  })
    .index("by_preloadId", ["preloadId"])
    .index("by_preloadId_and_generation", ["preloadId", "generation"])
    .index("by_preloadId_and_userId", ["preloadId", "userId"])
    .index("by_teamId", ["teamId"]),
  whatsappBroadcastSchedules: defineTable({
    agentId: v.id("agents"),
    orgId: v.string(),
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    totalCount: v.number(),
    processedAt: v.optional(v.number()),
    okCount: v.optional(v.number()),
    failCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_agentId_and_scheduledAt", ["agentId", "scheduledAt"])
    .index("by_orgId_and_status", ["orgId", "status"]),
  whatsappBroadcastRecipients: defineTable({
    scheduleId: v.id("whatsappBroadcastSchedules"),
    orgId: v.string(),
    customerId: v.id("customers"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    processedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    messageId: v.optional(v.id("messages")),
  })
    .index("by_scheduleId", ["scheduleId"])
    .index("by_scheduleId_and_status", ["scheduleId", "status"])
    .index("by_orgId", ["orgId"]),
  followUpRules: defineTable({
    agentId: v.id("agents"),
    orgId: v.string(),
    channelId: v.id("channels"),
    name: v.string(),
    attempts: v.array(
      v.object({
        attemptNumber: v.number(),
        templateName: v.string(),
        templateLanguage: v.string(),
      })
    ),
    maxAttempts: v.number(),
    triggerDelayHours: v.number(),
    intervalHours: v.number(),
    audienceLeadTemperatures: v.array(
      v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold"))
    ),
    audienceTags: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    messagesSentCount: v.optional(v.number()),
    repliesReceivedCount: v.optional(v.number()),
    estimatedCostPerCustomer: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_orgId_and_isActive", ["orgId", "isActive"]),
  followUpSends: defineTable({
    ruleId: v.id("followUpRules"),
    orgId: v.string(),
    recipientPhone: v.string(),
    recipientName: v.optional(v.string()),
    attemptNumber: v.number(),
    templateName: v.string(),
    templateLanguage: v.string(),
    sentAt: v.number(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
    estCostMyr: v.number(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_ruleId_and_sentAt", ["ruleId", "sentAt"])
    .index("by_orgId", ["orgId"]),
  rawAgentUsage: defineTable({
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    usage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
    }),
    providerMetadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_agentId", ["agentId"]),
  conversationLogs: defineTable({
    conversationId: v.id("conversations"),
    orgId: v.string(),
    action: v.union(
      // Conversation lifecycle
      v.literal("thread_created"),
      v.literal("broadcast_sent"),
      v.literal("reminder_sent"),
      v.literal("followup_sent"),
      v.literal("ai_enabled"),
      v.literal("ai_disabled"),
      v.literal("assignee_changed"),
      v.literal("escalation_raised"),
      v.literal("escalation_resolved"),
      // Tags
      v.literal("tag_added"),
      v.literal("tag_removed"),
      // Calendar / Booking
      v.literal("event_booked"),
      v.literal("event_updated"),
      v.literal("event_cancelled"),
      v.literal("event_deleted"),
      // Lead
      v.literal("lead_status_changed"),
      v.literal("user_details_changed"),
    ),
    // Who performed the action
    actorType: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    actorName: v.optional(v.string()),     // Display name (user name or agent name)
    actorUserId: v.optional(v.string()),   // workosUserId if user
    actorAgentId: v.optional(v.id("agents")),
    // What changed (flexible metadata)
    metadata: v.optional(v.any()),  // e.g. { tag: "VIP" }, { assigneeName: "John" }, { eventTitle: "Consultation" }
    performedAt: v.number(),
  })
    .index("by_conversationId_and_performedAt", ["conversationId", "performedAt"])
    .index("by_actorAgentId_and_action_and_performedAt", [
      "actorAgentId",
      "action",
      "performedAt",
    ])
    .index("by_orgId_and_performedAt", ["orgId", "performedAt"]),
  whatsappTemplates: defineTable({
    orgId: v.string(),
    channelId: v.id("channels"),
    name: v.string(),
    language: v.string(),
    purpose: v.union(v.literal("broadcasting"), v.literal("follow_up")),
    category: v.union(v.literal("MARKETING"), v.literal("UTILITY")),
    parameterFormat: v.optional(whatsappTemplateParameterFormatValidator),
    components: v.any(),
    status: whatsappTemplateStatusValidator,
    error: v.optional(v.string()),
    metaTemplateId: v.optional(v.string()),
    statusUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_orgId_and_channelId", ["orgId", "channelId"])
    .index("by_channelId_and_name_and_language", ["channelId", "name", "language"])
    .index("by_orgId_and_channelId_and_status", ["orgId", "channelId", "status"])
    .index("by_channelId_and_metaTemplateId", ["channelId", "metaTemplateId"]),
  whatsappTemplateMediaAssets: defineTable({
    orgId: v.string(),
    channelId: v.id("channels"),
    templateId: v.id("whatsappTemplates"),
    templateName: v.string(),
    templateLanguage: v.string(),
    r2Key: v.string(),
    filename: v.string(),
    mimeType: whatsappTemplateMediaMimeTypeValidator,
    headerFormat: whatsappTemplateHeaderFormatValidator,
    mediaId: v.optional(v.string()),
    status: whatsappTemplateMediaStatusValidator,
    uploadedAt: v.optional(v.number()),
    retryCount: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_templateId", ["templateId"])
    .index("by_channelId_and_templateName_and_templateLanguage", [
      "channelId",
      "templateName",
      "templateLanguage",
    ])
    .index("by_orgId", ["orgId"]),
  // ─── Bulk CSV Customer Import ────────────────────────────
  // Parent table aggregating progress across one or more import jobs/chunks.
  customerImports: defineTable({
    orgId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    fileName: v.string(),
    totalRows: v.number(),
    processedRows: v.number(),
    failedRows: v.number(),
    skippedRows: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"]),

  // One row per import job. Tracks overall progress and settings.
  customerImportJobs: defineTable({
    importId: v.optional(v.id("customerImports")),
    orgId: v.string(),
    agentId: v.optional(v.id("agents")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    fileName: v.string(),
    totalRows: v.number(),
    processedRows: v.number(),
    failedRows: v.number(),
    skippedRows: v.number(),
    /** Maps our customer field key → CSV column header name */
    fieldMapping: v.record(v.string(), v.string()),
    /** Tags to apply to every imported customer */
    tags: v.array(v.string()),
    leadTemperature: v.optional(
      v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold")),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_importId", ["importId"])
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"]),
  // One row per batch of CSV rows within an import job.
  customerImportRows: defineTable({
    jobId: v.id("customerImportJobs"),
    batchIndex: v.number(),
    /** Array of raw row objects (column header → cell value) */
    rows: v.array(v.record(v.string(), v.string())),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    processedCount: v.number(),
    failedCount: v.number(),
    skippedCount: v.number(),
    errorMessage: v.optional(v.string()),
    rowIssues: v.optional(
      v.array(
        v.object({
          rowNumber: v.number(),
          name: v.string(),
          reason: v.string(),
          type: v.union(v.literal("skipped"), v.literal("failed")),
        })
      )
    ),
  })
    .index("by_jobId", ["jobId"])
    .index("by_jobId_and_status", ["jobId", "status"]),
  teamDeletionJobs: teamDeletionJobsTable,
  teamExternalResources: teamExternalResourcesTable,
  deletedTeamOrganizations: deletedTeamOrganizationsTable,
});
