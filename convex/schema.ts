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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workosOrgId", ["workosOrgId"]),
  // Used for webhook idempotency. WorkOS may retry deliveries; dedupe on event.id.
  processedEvents: defineTable({
    eventId: v.string(),
    processedAt: v.number(),
  }).index("by_eventId", ["eventId"]),
  agents: defineTable({
    name: v.string(),
    provider: v.literal("google"),
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
    notes: v.optional(v.string()),
    source: customerServiceValidator,
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastConversationId: v.optional(v.id("conversations")),
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
    ),
    tags: v.optional(v.array(v.string())),
    interactionSummary: v.optional(v.string()),
    assignedAgentId: v.optional(v.id("agents")),
    assignedUserId: v.optional(v.string()),
    assignToAiAgent: v.boolean(),
    threadId: v.string(),
    lastMessageAt: v.number(),
    /** Last inbound (customer) message time — used for Meta messaging window checks. */
    lastCustomerMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    unreadCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId_and_lastMessageAt", ["orgId", "lastMessageAt"])
    .index("by_channel_and_contactAddress", ["channelId", "contactAddress"])
    .index("by_threadId", ["threadId"])
    .index("by_customerId", ["customerId"]),
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
});
