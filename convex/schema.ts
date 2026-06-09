import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const serviceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
);

const conversationServiceValidator = v.union(
  v.literal("playground"),
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
);

const customerServiceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("manual"),
);

export default defineSchema({
  users: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    credits: v.optional(v.number()),
    purchasedCredits: v.optional(v.number()),
    purchasedCreditsGranted: v.optional(v.number()),
    plan: v.optional(
      v.union(
        v.literal("free"),
        v.literal("standard"),
        v.literal("pro"),
        v.literal("ultra"),
      )
    ),
    lastActiveAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripeSubscriptionCurrentPeriodEnd: v.optional(v.number()),
    creditsPeriodMonthKey: v.optional(v.string()),
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
    .index("by_email", ["email"]),
  organizations: defineTable({
    workosOrgId: v.string(),
    name: v.string(),
    members: v.array(v.id("users")),
    admins: v.array(v.id("users")),
    plan: v.optional(
      v.union(
        v.literal("free"),
        v.literal("standard"),
        v.literal("pro"),
        v.literal("ultra"),
      )
    ),
    credits: v.optional(v.number()),
    purchasedCredits: v.optional(v.number()),
    purchasedCreditsGranted: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripeSubscriptionCurrentPeriodEnd: v.optional(v.number()),
    creditsPeriodMonthKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workosOrgId", ["workosOrgId"]),
  teams: defineTable({
    type: v.union(v.literal("personal"), v.literal("organizational")),
    name: v.string(),
    ownerId: v.id("users"),
    workosOrgId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    domain: v.optional(v.string()),
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
  agents: defineTable({
    name: v.string(),
    provider: v.union(v.literal("google"), v.literal("openrouter")),
    model: v.string(),
    systemPrompt: v.string(),
    templateKey: v.union(
      v.literal("blank"),
      v.literal("sales"),
      v.literal("support"),
    ),
    websiteUrls: v.optional(v.array(v.string())),
    contacts: v.optional(v.string()),
    fileSize: v.number(),
    userId: v.string(),
    orgId: v.string(),
    escalationEnabled: v.optional(v.boolean()),
    escalationMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
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
    .index("by_userId_and_orgId", ["userId", "orgId"]),
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
    .index("by_userId_and_orgId", ["userId", "orgId"]),
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
    .index("by_userId_and_orgId", ["userId", "orgId"]),
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
    .index("by_userId_and_orgId", ["userId", "orgId"]),
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
    lastError: v.optional(v.string()),
    connectedByUserId: v.string(),
    defaultAgentId: v.optional(v.id("agents")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_service", ["orgId", "service"])
    .index("by_phoneNumberId", ["phoneNumberId"])
    .index("by_igUserId", ["igUserId"])
    .index("by_pageId", ["pageId"])
    .index("by_fbUserId", ["fbUserId"]),
  // A customer is anyone who messaged the org via any channel, or who was
  // added manually. Natural key is (orgId, service, contactAddress).
  customers: defineTable({
    orgId: v.string(),
    service: customerServiceValidator,
    contactAddress: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_lastSeenAt", ["orgId", "lastSeenAt"])
    .index("by_orgId_and_service_and_contactAddress", [
      "orgId",
      "service",
      "contactAddress",
    ]),
  // Unified conversation table. service: "playground" rows are AI-playground
  // threads; the rest are channel-backed inbox conversations.
  conversations: defineTable({
    orgId: v.string(),
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
      v.literal("requires_user_input"),
    ),
    escalation: v.optional(
      v.object({
        question: v.string(),
        context: v.string(),
        escalatedAt: v.number(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_lastMessageAt", ["orgId", "lastMessageAt"])
    .index("by_channel_and_contactAddress", ["channelId", "contactAddress"])
    .index("by_threadId", ["threadId"])
    .index("by_customerId", ["customerId"])
    .index("by_orgId_and_service_and_assignedAgentId_and_assignedUserId", [
      "orgId",
      "service",
      "assignedAgentId",
      "assignedUserId",
    ]),
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
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("read"),
        v.literal("failed"),
      ),
    ),
    failureReason: v.optional(v.string()),
    agentMessageId: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    creditsCharged: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversationId_and_createdAt", ["conversationId", "createdAt"])
    .index("by_agentMessageId", ["agentMessageId"])
    .index("by_externalId", ["externalId"])
    .index("by_orgId", ["orgId"]),
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
  }).index("by_csrf", ["csrf"]),
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
    purpose: v.optional(v.literal("knowledgeBase")),
    agentId: v.optional(v.id("agents")),
    collectionName: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_orgId_userId_clientId", ["orgId", "userId", "clientId"])
    .index("by_orgId_userId", ["orgId", "userId"])
    .index("by_agentId", ["agentId"]),
  // One row per billing month (or Stripe period). `amount` is the grant;
  // `balance` is what's left in that period before top-ups are touched.
  creditPeriods: defineTable({
    orgId: v.string(),
    userId: v.optional(v.id("users")),
    periodKey: v.string(),
    amount: v.number(),
    balance: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_periodKey", ["orgId", "periodKey"])
    .index("by_userId_and_periodKey", ["userId", "periodKey"]),
  // One row per top-up purchase. Usage deducts from entries FIFO by createdAt.
  topUpEntries: defineTable({
    orgId: v.string(),
    userId: v.optional(v.id("users")),
    amount: v.number(),
    balance: v.number(),
    label: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_userId", ["userId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),
  creditLogs: defineTable({
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
    creditPeriodId: v.optional(v.id("creditPeriods")),
    topUpEntryId: v.optional(v.id("topUpEntries")),
    deductionSource: v.optional(
      v.union(v.literal("monthly"), v.literal("top_up")),
    ),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"])
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_teamId_and_startAt", ["teamId", "startAt"])
    .index("by_teamId_and_externalProvider_and_externalEventId", [
      "teamId",
      "externalProvider",
      "externalEventId",
    ]),
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
    .index("by_teamId_and_role_and_customerId_and_eventStartAt", [
      "teamId",
      "role",
      "customerId",
      "eventStartAt",
    ]),
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
  }).index("by_ruleId_and_sentAt", ["ruleId", "sentAt"]),
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
  }),
});
