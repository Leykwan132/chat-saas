import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { components } from "../_generated/api";
import { captureAIGeneration } from "../posthog";
import {
  createThread,
  saveMessage,
  Agent,
  stepCountIs,
  createTool,
} from "@convex-dev/agent";
import type { ToolSet } from "ai";
import { resolveLanguageModel } from "../llm/languageModel";
import { z } from "zod";
import { internal } from "../_generated/api";
import {
  INBOX_AUDIO_PLACEHOLDER,
  INBOX_IMAGE_PLACEHOLDER,
  inboxAttachmentsProviderMetadata,
  toInboxAttachments,
  type InboxAttachment,
} from "../../shared/inboxAttachments";
import { INBOX_REACTION_EMOJIS } from "../../shared/messageReactions";
import {
  INBOX_ORDER_SPACER_TEXT,
  type InboxOutboundMeta,
} from "./inboxMessageMapping";
import { applyInboundLeadRouting, isAnyoneOnSchedule } from "../leadRouting/assign";
import { getOrCreateLeadAssignmentSettings } from "../leadRouting/helpers";
import { DEFAULT_TEAM_TIME_ZONE, getUserByWorkosId, normalizeTimeZone } from "../teamHelpers";
import { logConversationEvent } from "../conversationLogs";
import {
  buildWorkflowRuntimeBlock,
  type WorkflowRuntimeContextForPrompt,
} from "./workflowPrompt";
import { chatResponseFormattingBlock } from "./responseFormatting";
import { buildToolUsageBlock } from "./toolPrompt";
import type {
  BroadcastMessageKind,
  BroadcastPresentation,
} from "../../shared/broadcastMessage";
import {
  broadcastPresentationValidator,
  messageKindValidator,
} from "../broadcastMessageValidators";
import { broadcastAgentMetadata } from "./broadcastMessageMetadata";

const UNKNOWN_AGENT_NAME = "Unknown agent";

type UsageWithTokenAliases = {
  promptTokens?: number;
  inputTokens?: number;
  completionTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

export async function resolveAssignedAgentName(
  ctx: MutationCtx,
  assignedAgentId: Id<"agents"> | undefined,
): Promise<string> {
  if (assignedAgentId === undefined) {
    return UNKNOWN_AGENT_NAME;
  }
  const agent = await ctx.db.get(assignedAgentId);
  const name = agent?.name?.trim();
  return name && name.length > 0 ? name : UNKNOWN_AGENT_NAME;
}

export function orgThreadUserId(orgId: string): string {
  return `org:${orgId}`;
}

export function conversationThreadTitle(
  contactName: string | undefined,
  contactAddress: string,
  service: string,
): string {
  return `${contactName ?? contactAddress} - ${service}`;
}

export async function createThreadForConversation(
  ctx: MutationCtx,
  args: {
    orgId: string;
    contactName?: string;
    contactAddress: string;
    service: string;
    userId?: string;
  },
): Promise<string> {
  const userId = args.userId ?? orgThreadUserId(args.orgId);
  const title = conversationThreadTitle(
    args.contactName,
    args.contactAddress,
    args.service,
  );
  return await createThread(ctx, components.agent, { userId, title });
}

export async function saveUserMessage(
  ctx: MutationCtx,
  threadId: string,
  content: string,
  sentAt: number = Date.now(),
  images?: Array<{ url: string; mimeType: string }>,
  files?: Array<{ url: string; mimeType: string }>,
): Promise<string> {
  const audioFiles = files ?? [];
  const hasImages = images !== undefined && images.length > 0;
  const hasAudio = audioFiles.length > 0;
  const trimmed = content.trim();

  let messageContent = trimmed;
  const metadata: Record<string, unknown> = { sentAt };

  if (hasImages || hasAudio) {
    if (trimmed.length > 0) {
      messageContent = trimmed;
    } else if (hasImages && hasAudio) {
      messageContent = `${INBOX_IMAGE_PLACEHOLDER}\n${INBOX_AUDIO_PLACEHOLDER}`;
    } else if (hasImages) {
      messageContent = INBOX_IMAGE_PLACEHOLDER;
    } else {
      messageContent = INBOX_AUDIO_PLACEHOLDER;
    }
  }

  const attachmentMetadata = inboxAttachmentsProviderMetadata({
    audio: hasAudio ? audioFiles : undefined,
    images: hasImages ? images : undefined,
  });
  if (attachmentMetadata) {
    metadata.providerMetadata = attachmentMetadata;
  }

  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId,
    message: { role: "user", content: messageContent },
    metadata,
  });
  return messageId;
}

/**
 * Each outbound assistant message needs a distinct `order` in the agent
 * component. Consecutive assistant saves share an order and get merged in the
 * UI. We insert a hidden user "spacer" turn first, then attach the assistant
 * reply to that turn via `promptMessageId`.
 */
type HumanReplyImage = { url: string; mimeType: string };

function buildHumanReplyContent(
  text: string,
  images: HumanReplyImage[],
  files: Array<{ url: string; mimeType: string }> = [],
): string {
  const trimmed = text.trim();
  if (images.length === 0 && files.length === 0) {
    return trimmed;
  }
  if (trimmed.length > 0) {
    return trimmed;
  }
  if (images.length > 0 && files.length > 0) {
    return `${INBOX_IMAGE_PLACEHOLDER}\n${INBOX_AUDIO_PLACEHOLDER}`;
  }
  if (images.length > 0) {
    return INBOX_IMAGE_PLACEHOLDER;
  }
  return INBOX_AUDIO_PLACEHOLDER;
}

async function saveAssistantWithOwnOrder(
  ctx: MutationCtx,
  args: {
    threadId: string;
    content: string;
    sentAt: number;
    outbound: InboxOutboundMeta;
    inboxAttachments?: InboxAttachment[];
    messageMetadata?: Record<string, unknown>;
  },
): Promise<string> {
  const { messageId: spacerId } = await saveMessage(ctx, components.agent, {
    threadId: args.threadId,
    message: { role: "user", content: INBOX_ORDER_SPACER_TEXT },
    metadata: { inboxOrderSpacer: true, sentAt: args.sentAt } as Record<
      string,
      unknown
    >,
  });

  const provider = args.outbound.sentByAi
    ? "ai"
    : args.outbound.authorUserId
      ? "human"
      : "channel";

  const providerMetadata = {
    ...(args.outbound.sentByAi
      ? { ai: { agentName: args.outbound.agentName } }
      : args.outbound.authorUserId
        ? {
            human: {
              userId: args.outbound.authorUserId,
              username: args.outbound.authorName,
            },
          }
        : { channel: { name: args.outbound.channelName ?? args.outbound.agentName } }),
    ...(args.inboxAttachments?.length
      ? { inbox: { attachments: args.inboxAttachments } }
      : {}),
  };

  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId: args.threadId,
    agentName: args.outbound.agentName,
    message: { role: "assistant", content: args.content },
    promptMessageId: spacerId,
    metadata: {
      sentAt: args.sentAt,
      inboxOutbound: args.outbound,
      provider,
      providerMetadata,
      ...(args.messageMetadata ?? {}),
    } as Record<string, unknown>,
  });
  return messageId;
}

export async function saveHumanReply(
  ctx: MutationCtx,
  threadId: string,
  content: string,
  opts: {
    assignedAgentId: Id<"agents"> | undefined;
    authorUserId?: string;
    sentAt?: number;
    images?: HumanReplyImage[];
    files?: Array<{ url: string; mimeType: string }>;
    authorName?: string;
    channelName?: string;
    messageMetadata?: Record<string, unknown>;
  },
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, opts.assignedAgentId);
  const replyContent = buildHumanReplyContent(content, opts.images ?? [], opts.files ?? []);

  let authorName = opts.authorName;
  if (authorName === undefined && opts.authorUserId !== undefined) {
    const user = await getUserByWorkosId(ctx, opts.authorUserId);
    if (user) {
      authorName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
    }
  }

  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content: replyContent,
    sentAt: opts.sentAt ?? Date.now(),
    outbound: {
      agentName,
      sentByAi: false,
      ...(opts.authorUserId !== undefined
        ? { authorUserId: opts.authorUserId }
        : {}),
      ...(authorName !== undefined ? { authorName } : {}),
      ...(opts.channelName !== undefined ? { channelName: opts.channelName } : {}),
    },
    inboxAttachments:
      (opts.files?.length ?? 0) > 0 || (opts.images?.length ?? 0) > 0
        ? toInboxAttachments({
            audio: opts.files,
            images: opts.images,
          })
        : undefined,
    messageMetadata: opts.messageMetadata,
  });
}

/** Outbound human reply with caption text and image attachments in inbox metadata. */
export async function saveHumanReplyTextAndImages(
  ctx: MutationCtx,
  threadId: string,
  text: string,
  images: HumanReplyImage[],
  opts: {
    assignedAgentId: Id<"agents"> | undefined;
    authorUserId?: string;
    sentAt?: number;
    clientIds?: string[];
    authorName?: string;
    channelName?: string;
  },
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, opts.assignedAgentId);
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Text is required when saving text and images together");
  }
  if (images.length === 0) {
    throw new Error("At least one image is required when saving text and images together");
  }
  const sentAt = opts.sentAt ?? Date.now();

  let authorName = opts.authorName;
  if (authorName === undefined && opts.authorUserId !== undefined) {
    const user = await getUserByWorkosId(ctx, opts.authorUserId);
    if (user) {
      authorName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
    }
  }

  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content: trimmed,
    sentAt,
    outbound: {
      agentName,
      sentByAi: false,
      ...(opts.authorUserId !== undefined
        ? { authorUserId: opts.authorUserId }
        : {}),
      ...(authorName !== undefined ? { authorName } : {}),
      ...(opts.channelName !== undefined ? { channelName: opts.channelName } : {}),
    },
    inboxAttachments: toInboxAttachments({ images }),
    messageMetadata:
      opts.clientIds !== undefined && opts.clientIds.length > 0
        ? { clientIds: opts.clientIds }
        : undefined,
  });
}

export async function saveAiReply(
  ctx: MutationCtx,
  threadId: string,
  content: string,
  assignedAgentId: Id<"agents"> | undefined,
  sentAt: number = Date.now(),
  opts?: {
    inboxAttachments?: InboxAttachment[];
    messageMetadata?: Record<string, unknown>;
  },
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, assignedAgentId);
  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content,
    sentAt,
    outbound: {
      agentName,
      sentByAi: true,
    },
    inboxAttachments: opts?.inboxAttachments,
    messageMetadata: opts?.messageMetadata,
  });
}

export { inferMediaMimeType } from "./mediaUrlExtractor";

export type ActiveBookingServiceForPrompt = {
  serviceId: Id<"appointmentServices">;
  name: string;
  description?: string;
  durationMinutes: number;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
  preferredTimeMinutes?: number[];
  salesStyle: "proactive" | "neutral" | "gentle";
  timeZone: string;
};

function formatPreferredTimeLabels(minutes: number[]) {
  return minutes
    .map((value) => {
      const hours24 = Math.floor(value / 60);
      const mins = value % 60;
      const period = hours24 >= 12 ? "PM" : "AM";
      const hours12 = hours24 % 12 || 12;
      return `${hours12}:${mins.toString().padStart(2, "0")} ${period}`;
    })
    .join(", ");
}

function buildActiveBookingServicesBlock(services: ActiveBookingServiceForPrompt[]) {
  const serviceSections = services
    .map((service, index) => {
      const lines = [
        `### ${index + 1}. ${service.name}`,
        `- Service ID: ${service.serviceId}`,
        service.description ? `- Description: ${service.description}` : undefined,
        `- Duration: ${service.durationMinutes} minutes`,
        `- Time zone: ${service.timeZone}`,
        `- Required booking fields: ${service.fields.map((field) => `${field.label} (key: \`${field.key}\`)`).join(", ")}`,
        service.preferredTimeMinutes && service.preferredTimeMinutes.length > 0
          ? `- Preferred times (offer these first): ${formatPreferredTimeLabels(service.preferredTimeMinutes)}`
          : undefined,
      ].filter((line): line is string => line !== undefined);
      return lines.join("\n");
    })
    .join("\n\n");

  return `\n\n## Available Appointment Services
The following Services are available for appointment booking when the workflow indicates Book appointment.

${serviceSections}`;
}

function getCurrentDateInfo(timeZone: string) {
  const tz = normalizeTimeZone(timeZone);
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
  const dateIsoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return {
    timeZone: tz,
    isoTimestamp: now.toISOString(),
    dateIso: dateIsoFormatter.format(now),
    date: dateFormatter.format(now),
    time: timeFormatter.format(now),
  };
}

function buildBookingFlowBlock() {
  return `\n\n## Booking Flow
Use the Workflow Runtime first to decide whether the customer is in a Book appointment stage. Use the available Services listed above for service IDs and required fields.
Available Services are the complete booking catalog for this turn. Knowledge-base results can help you understand or explain how a customer request relates to those Services, but they are not bookable Services and must not be used as service IDs.

- Call \`getTodayDate\` whenever you need today's date or current time — for example when interpreting "today", "tomorrow", "next week", or validating booking dates. Do not guess the current date.
1. *Start session* — When the customer wants to book, call \`startBookingSession\` with the matching service ID. If they have already shared details, include them in \`collectedFields\`.
2. *Collect details* — Read \`missingFields\` from the tool response and ask only for what is still missing. Always ask in chat for name, phone, date, and time for the person being booked — do not use the chatter's contact details. Call \`startBookingSession\` again with new \`collectedFields\` until \`readyForAvailability\` is true.
3. *Check slots* — Call \`checkAvailability\` only after the session is ready. Present the returned slots to the customer.
4. *Book* — After the customer clearly confirms a slot, call \`giveReaction\` on their confirmation message, then call \`bookAppointment\`.
5. *Confirm* — Immediately after \`bookAppointment\` succeeds, call \`sendBookingConfirmation\` and send the returned \`confirmationMessage\` to the customer exactly as written. Do not rewrite it. Do not send the confirmation message before \`giveReaction\` on the customer's confirmation.

## Editing an existing booking
If the customer wants to change their booking (time, name, phone, or any other detail):
1. *View booking* — Call \`getCurrentBooking\` to show what is currently booked.
2. *Start edit* — Call \`beginBookingEdit\` to open an edit session for that booking.
3. *Update details* — Call \`startBookingSession\` with the changed \`collectedFields\`. Ask in chat for any details they want to change.
4. *Check slots* — If the time is changing, call \`checkAvailability\` after \`readyForAvailability\` is true and present the new slots.
5. *Apply changes* — After the customer confirms, call \`giveReaction\` on their confirmation message first, then call \`updateBookingAppointment\` with the service ID and confirmed \`startTimeIso\`. If only non-time details changed, use the current booking time from \`getCurrentBooking\`.
6. *Confirm update* — Call \`sendBookingUpdateConfirmation\` and send the returned \`confirmationMessage\` exactly as written. Do not send the confirmation message before \`giveReaction\` on the customer's confirmation.

## Cancelling an existing booking
If the customer wants to cancel a confirmed appointment:
1. Call \`getCurrentBooking\` to verify the current appointment.
2. If the customer has clearly asked to cancel, call \`cancelBooking\`.
3. Tell the customer the booking has been cancelled only after \`cancelBooking\` succeeds.

Additional rules:
- If multiple Services could apply and the customer has not chosen one, ask which service they want before starting the session.
- Do not start a new booking unless the Book appointment workflow conditions match or the customer explicitly asks to book.
- Do NOT say the appointment is booked until \`bookAppointment\` succeeds.
- If the customer declines a slot, changes their mind, or asks to stop booking, call \`cancelBooking\` before replying.
- During a booking edit, \`cancelBooking\` discards the changes and keeps the original booking.
- Outside an edit, \`cancelBooking\` cancels the existing confirmed appointment when one exists.`;
}

export function buildAgent(
  agent: {
    name: string;
    model: string;
    systemPrompt: string;
    responseLength?: string;
    emojiUse?: string;
    formality?: string;
    humorLevel?: string;
  },
  agentId: Id<"agents">,
  enableCitations: boolean = false,
  conversationId?: Id<"conversations">,
  activeBookingServices: ActiveBookingServiceForPrompt[] = [],
  workflowRuntimeContext: WorkflowRuntimeContextForPrompt = null,
) {
  const appointmentBookingEnabled = conversationId !== undefined && activeBookingServices.length > 0;
  const defaultBookingTimeZone = normalizeTimeZone(activeBookingServices[0]?.timeZone);
  const humanEscalationNodeIds = new Set(
    workflowRuntimeContext?.nodes
      .filter((node) => node.kind === "humanEscalation")
      .map((node) => node.nodeId) ?? [],
  );
  const escalationConfigured = humanEscalationNodeIds.size > 0;
  const hasWorkflowMediaNodes =
    workflowRuntimeContext?.nodes.some((node) =>
      node.kind === "sendImage" || node.kind === "sendFile"
    ) ?? false;

  const tools: ToolSet = {
    fetchContext: createTool({
      description:
        "MUST be called before answering ANY user question. Searches the knowledge base (uploaded documents, Q&A pairs, web references) for relevant context. Always call this first — even if you think you know the answer.",
      inputSchema: z.object({
        query: z.string().describe("The exact user original query"),
      }),
      execute: async (ctx, { query }) => {
        const result = await ctx.runAction(internal.cloudflare.internalSearch, {
          agentId,
          query,
        });
        return result;
      },
    }),
  };

  if (escalationConfigured) {
    tools.escalateToHuman = createTool({
      description:
        "Call this tool when the customer's latest message matches a Human escalation workflow node, when you lack confidence in answering, when you do not have enough details to answer, or when the user explicitly requests a human agent. Do NOT send any message to the user when escalating — call this tool only. This will pause automated responses and alert a human teammate to take over.",
      inputSchema: z.object({
        question: z.string().describe("The exact user question or issue you are unsure of or lack detail to answer."),
        context: z.string().describe("The reason or context explaining why you are unsure, what detail is missing, or why the conversation needs a human."),
        workflowNodeId: z.string().optional().describe("The exact Human escalation workflow node ID that matched, if a node condition matched."),
      }),
      execute: async (ctx, { question, context, workflowNodeId }) => {
        if (workflowNodeId !== undefined && !humanEscalationNodeIds.has(workflowNodeId as Id<"workflowNodes">)) {
          throw new Error("Human escalation node is not available in the active workflow");
        }
        if (conversationId) {
          await ctx.runMutation(internal.chat.inbox.internalEscalateConversation, {
            conversationId,
            question,
            context,
          });
        }
        return { success: true, message: "Escalated to human. Automated responses are paused." };
      },
    });
  }

  if (conversationId) {
    tools.giveReaction = createTool({
      description:
        "Give a small assurance reaction to the customer's latest message. REQUIRED when the customer confirms a booking slot or approves booking changes: call this on their confirmation message before `sendBookingConfirmation` or `sendBookingUpdateConfirmation`, and before sending that confirmation text. Also use after you have fulfilled other requests or answered one concrete question. Do not use for greetings, jokes, unclear requests, complaints that need escalation, or before the customer has clearly confirmed when a confirmation message is next.",
      inputSchema: z.object({
        target: z.literal("latest_user_message").describe("Always react to the latest customer message."),
        emoji: z.enum(INBOX_REACTION_EMOJIS).describe("Use one assurance-oriented emoji."),
      }),
      execute: async (ctx, { emoji }) => {
        return await ctx.runAction(
          internal.chat.inboxActions.internalReactToLatestCustomerMessage,
          {
            conversationId,
            emoji,
            actorAgentId: agentId,
            actorName: agent.name,
          },
        );
      },
    });
  }

  if (conversationId && appointmentBookingEnabled) {
    const collectedFieldsSchema = z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    );

    tools.getTodayDate = createTool({
      description:
        "Returns today's date and current time from the server. Call this whenever you need the current date or time for booking, scheduling, or interpreting relative dates like 'today', 'tomorrow', or 'next Tuesday'. Do not guess — use this tool.",
      inputSchema: z.object({
        timeZone: z.string().optional().describe("IANA timezone for the date, e.g. Asia/Kuala_Lumpur. Defaults to the booking service time zone."),
      }),
      execute: async (_ctx, { timeZone }) => getCurrentDateInfo(timeZone ?? defaultBookingTimeZone ?? DEFAULT_TEAM_TIME_ZONE),
    });

    tools.getCurrentBooking = createTool({
      description:
        "Returns the customer's current booked appointment for this conversation, including service, collected details, date, time, and team member. Call when the customer asks about or wants to change an existing booking.",
      inputSchema: z.object({}),
      execute: async (ctx) => {
        return await ctx.runQuery(internal.appointmentBooking.currentBooking.getCurrentBooking, {
          conversationId,
        });
      },
    });

    tools.beginBookingEdit = createTool({
      description:
        "Starts editing an existing booked appointment. Call when the customer wants to change their booking. After this, use startBookingSession to update details and updateBookingAppointment to save changes to the calendar.",
      inputSchema: z.object({}),
      execute: async (ctx) => {
        return await ctx.runMutation(internal.appointmentBooking.editing.beginBookingEdit, {
          conversationId,
        });
      },
    });

    tools.startBookingSession = createTool({
      description:
        "Starts or updates the Services session when the customer wants to book, or updates collected details during a booking edit. Use only a service ID from Available Appointment Services. Returns which required fields are still missing. Call this first for new bookings, or after beginBookingEdit when changing details.",
      inputSchema: z.object({
        serviceId: z.string().optional().describe("The selected Services service ID."),
        collectedFields: collectedFieldsSchema.optional().describe("Booking details collected from the customer so far, keyed by field key."),
      }),
      execute: async (ctx, input) => {
        return await ctx.runMutation(internal.appointmentBooking.sessions.startBookingSession, {
          conversationId,
          ...(input.serviceId ? { serviceId: input.serviceId as Id<"appointmentServices"> } : {}),
          ...(input.collectedFields ? { collectedFields: input.collectedFields } : {}),
        });
      },
    });

    tools.checkAvailability = createTool({
      description:
        "Checks available appointment slots for the active booking or booking-edit session. Use only a service ID from Available Appointment Services. Call only after startBookingSession returns readyForAvailability true. For customer-suggested times, pass preferredTimeIso.",
      inputSchema: z.object({
        serviceId: z.string().optional().describe("The selected Services service ID."),
        preferredTimeIso: z.string().optional().describe("Customer's preferred appointment start time as an ISO timestamp."),
        rangeStartIso: z.string().optional().describe("Start of the search range as an ISO timestamp."),
        rangeEndIso: z.string().optional().describe("End of the search range as an ISO timestamp."),
      }),
      execute: async (ctx, input) => {
        const args: {
          conversationId: Id<"conversations">;
          serviceId?: Id<"appointmentServices">;
          preferredStartAt?: number;
          rangeStartAt?: number;
          rangeEndAt?: number;
        } = { conversationId };
        if (input.serviceId) {
          args.serviceId = input.serviceId as Id<"appointmentServices">;
        }
        const preferredStartAt = input.preferredTimeIso ? Date.parse(input.preferredTimeIso) : NaN;
        if (Number.isFinite(preferredStartAt)) {
          args.preferredStartAt = preferredStartAt;
        }
        const rangeStartAt = input.rangeStartIso ? Date.parse(input.rangeStartIso) : NaN;
        if (Number.isFinite(rangeStartAt)) {
          args.rangeStartAt = rangeStartAt;
        }
        const rangeEndAt = input.rangeEndIso ? Date.parse(input.rangeEndIso) : NaN;
        if (Number.isFinite(rangeEndAt)) {
          args.rangeEndAt = rangeEndAt;
        }
        return await ctx.runMutation(internal.appointmentBooking.sessions.checkAvailability, args);
      },
    });

    tools.bookAppointment = createTool({
      description:
        "Creates the official calendar appointment for the active booking session. Use only a service ID from Available Appointment Services. Call only after the customer explicitly confirms the selected service and slot from checkAvailability.",
      inputSchema: z.object({
        serviceId: z.string().describe("The selected Services service ID."),
        startTimeIso: z.string().describe("Confirmed appointment start time as an ISO timestamp from checkAvailability."),
      }),
      execute: async (ctx, input) => {
        const startAt = Date.parse(input.startTimeIso);
        if (!Number.isFinite(startAt)) {
          return { success: false, message: "Invalid appointment start time." };
        }
        return await ctx.runMutation(internal.appointmentBooking.bookAppointment.bookAppointment, {
          conversationId,
          serviceId: input.serviceId as Id<"appointmentServices">,
          startAt,
        });
      },
    });

    tools.updateBookingAppointment = createTool({
      description:
        "Updates the existing calendar booking after a booking edit. Use only a service ID from Available Appointment Services. Call after beginBookingEdit and once the customer confirms the final details and time. Use the service ID and confirmed startTimeIso from checkAvailability, or the current booking time if only other details changed.",
      inputSchema: z.object({
        serviceId: z.string().describe("The Services service ID."),
        startTimeIso: z.string().describe("Confirmed appointment start time as an ISO timestamp."),
      }),
      execute: async (ctx, input) => {
        const startAt = Date.parse(input.startTimeIso);
        if (!Number.isFinite(startAt)) {
          return { success: false, message: "Invalid appointment start time." };
        }
        return await ctx.runMutation(internal.appointmentBooking.updateAppointment.updateBookingAppointment, {
          conversationId,
          serviceId: input.serviceId as Id<"appointmentServices">,
          startAt,
        });
      },
    });

    tools.sendBookingConfirmation = createTool({
      description:
        "Builds the final booking confirmation message after bookAppointment succeeds. Call only after `giveReaction` on the customer's slot confirmation. Send the returned confirmationMessage to the customer exactly as written.",
      inputSchema: z.object({}),
      execute: async (ctx) => {
        return await ctx.runMutation(internal.appointmentBooking.confirmations.sendBookingConfirmation, {
          conversationId,
        });
      },
    });

    tools.sendBookingUpdateConfirmation = createTool({
      description:
        "Builds the updated booking confirmation message after updateBookingAppointment succeeds. Call only after `giveReaction` on the customer's change confirmation. Send the returned confirmationMessage to the customer exactly as written.",
      inputSchema: z.object({}),
      execute: async (ctx) => {
        return await ctx.runMutation(internal.appointmentBooking.confirmations.sendBookingUpdateConfirmation, {
          conversationId,
        });
      },
    });

    tools.cancelBooking = createTool({
      description:
        "Cancels the customer's in-progress booking session or discards a booking edit. During an edit, this keeps the original booking unchanged.",
      inputSchema: z.object({}),
      execute: async (toolCtx) => {
        return await toolCtx.runMutation(internal.appointmentBooking.cancellations.cancelBookingSession, {
          conversationId,
        });
      },
    });
  }

  const citationBlock = enableCitations
    ? `\n\nWhen responding, include:
- A comprehensive paragraph with inline citations marked as [1], [2], etc.
- 2-3 citations with realistic source information
- Each citation MUST have a {title: "", url: "", description: ""} JSON object. If ANY of them doesn't exist, leave it as empty string "" for that key. 
- If it's a file, the URL value must start with https://storage.kilobot.app/{{fileName}}
- The description key MUST contain a short summary of the content from the source. 
- Make the content informative and the sources credible
Format citations as numbered references within the text. Use only sources found via \`fetchContext\` — do not fabricate sources.
- This is citations section, not references. Must use the keyword Citations.`
    : "";

  const toneBlock = escalationConfigured
    ? `\n\n## Tone
- Be warm, friendly, and conversational — like a helpful colleague, not a robot or search engine.
- Use natural, approachable phrasing. Brief is fine, but never sound cold, stiff, or overly formal.
- When you can help, sound glad to assist.
- Friendliness comes from how you say things, not from adding extra facts you don't have.`
    : `\n\n## Tone
- Be warm, friendly, and conversational — like a helpful colleague, not a robot or search engine.
- Use natural, approachable phrasing. Brief is fine, but never sound cold, stiff, or overly formal.
- When you can help, sound glad to assist. When you can't, say so kindly (e.g. "Sorry, I'm not sure about that" or "I don't have that info — let me know if there's something else I can help with").
- Friendliness comes from how you say things, not from adding extra facts you don't have.`;

  const groundingBlock = escalationConfigured
    ? `\n\n## Grounding — REQUIRED
- Only state facts that come directly from \`fetchContext\` results or explicit tool metadata (collection name, filename, etc.).
- Do NOT invent details, generic explanations, or filler about attachments or topics.
- Do NOT describe media contents, room layouts, dimensions, benefits, or implications unless \`fetchContext\` provided that information.
- Never mention internal tools, searches, or a "knowledge base" to the user.
- If tools returned nothing useful for the user's question, do NOT reply to the user. Call \`escalateToHuman\` instead. Never tell the user you don't know or ask if there is something else you can help with.`
    : `\n\n## Grounding — REQUIRED
- Only state facts that come directly from \`fetchContext\` results or explicit tool metadata (collection name, filename, etc.).
- Do NOT invent details, generic explanations, or filler about attachments or topics.
- Do NOT describe media contents, room layouts, dimensions, benefits, or implications unless \`fetchContext\` provided that information.
- Never mention internal tools, searches, or a "knowledge base" to the user.
- If tools returned nothing useful, reply briefly and honestly — but stay friendly. Do not guess or elaborate.`;

  const escalationBlock = escalationConfigured
    ? `\n\n## Escalating to a Human Teammate
You have an \`escalateToHuman\` tool. If you lack confidence, do not have enough detail in your knowledge base to answer, or if the user specifically asks to speak to a human, you MUST call this tool instead of replying to the user. Explain exactly what the user is asking and why you cannot answer it in the tool parameters. This will pause your automated responses and notify a teammate.
NEVER respond with phrases like "I don't have that information", "I'm not sure", or "let me know if there's something else I can help with" when you cannot answer. Escalate instead and send no user-facing reply.`
    : "";

  const bookingBlock = appointmentBookingEnabled
    ? `${buildActiveBookingServicesBlock(activeBookingServices)}${buildBookingFlowBlock()}`
    : "";
  const workflowBlock = buildWorkflowRuntimeBlock(workflowRuntimeContext);

  const noContextFallback = escalationConfigured
    ? "call `escalateToHuman` with the user's question and explain what information was missing. Do NOT send any message to the user."
    : "give a short, natural reply that you don't have that information";

  const toolUsageBlock = buildToolUsageBlock({
    escalationConfigured,
    hasWorkflowMediaNodes,
    noContextFallback,
  });

  const instructions = `${agent.systemPrompt}${(() => {
    let styleBlock = "";
    if (agent.responseLength || agent.emojiUse || agent.formality || agent.humorLevel) {
      styleBlock = "\n\n## Response Style Guidelines";
      if (agent.responseLength === "brief") {
        styleBlock += "\n- Keep your responses brief (1-2 sentences).";
      } else if (agent.responseLength === "standard") {
        styleBlock += "\n- Keep your responses standard length (2-5 sentences).";
      } else if (agent.responseLength === "detailed") {
        styleBlock += "\n- Keep your responses detailed (5-7 sentences).";
      }

      if (agent.emojiUse === "never") {
        styleBlock += "\n- Do not use any emojis in your responses under any circumstances.";
      } else if (agent.emojiUse === "occasional") {
        styleBlock += "\n- Use emojis occasionally (use them in some responses but don't overdo it).";
      } else if (agent.emojiUse === "frequent") {
        styleBlock += "\n- Use emojis frequently (use emojis in most responses to sound friendly and expressive 🤠).";
      }

      if (agent.formality === "casual") {
        styleBlock += "\n- Adopt a casual tone (e.g., 'No problem, gotcha covered!').";
      } else if (agent.formality === "conversational") {
        styleBlock += "\n- Adopt a conversational tone (e.g., 'Sure thing. I'll fix it right away.').";
      } else if (agent.formality === "professional") {
        styleBlock += "\n- Adopt a professional tone (e.g., 'I understand. We're addressing your concern now.').";
      }

      if (agent.humorLevel === "none") {
        styleBlock += "\n- Do not use humor (e.g., 'Let me look into that.'). Keep it straightforward.";
      } else if (agent.humorLevel === "light") {
        styleBlock += "\n- Use light humor when appropriate (e.g., 'Seems like we're in a bit of a pickle.').";
      } else if (agent.humorLevel === "playful") {
        styleBlock += "\n- Use playful, highly enthusiastic humor (e.g., 'Hold tight, I'm fetching your data faster than a squirrel!').";
      }
    }
    return styleBlock;
  })()}

${toolUsageBlock}${chatResponseFormattingBlock}${toneBlock}${groundingBlock}
  ${citationBlock}${escalationBlock}${workflowBlock}${bookingBlock}`;

  const resolvedModel = resolveLanguageModel(agent.model);

  return new Agent(components.agent, {
    name: agent.name,
    languageModel: resolvedModel.languageModel,
    instructions,
    stopWhen: stepCountIs(8),
    tools,
    usageHandler: async (ctx, args) => {
      const {
        userId,
        threadId,
        agentName,
        model,
        provider,
        usage,
        providerMetadata,
      } = args;
      const u = usage as UsageWithTokenAliases;
      const normalizedUsage = {
        promptTokens: u.promptTokens ?? u.inputTokens ?? 0,
        completionTokens: u.completionTokens ?? u.outputTokens ?? 0,
        totalTokens: u.totalTokens ?? 0,
        reasoningTokens: u.reasoningTokens ?? undefined,
        cachedInputTokens: u.cachedInputTokens ?? undefined,
      };
      const trackedUsage = await ctx.runMutation(internal.agentUsage.insertRawUsage, {
        userId: userId ?? undefined,
        threadId: threadId ?? undefined,
        agentId,
        agentName: agentName ?? undefined,
        model,
        provider,
        usage: normalizedUsage,
        providerMetadata,
      });

      const fallbackDistinctId =
        userId !== undefined && !userId.startsWith("org:") ? userId : undefined;
      await captureAIGeneration({
        distinctId: trackedUsage?.workosUserId ?? fallbackDistinctId ?? 'anonymous',
        traceId: threadId ?? agentId,
        spanName: 'inbox_ai_reply',
        model,
        provider,
        inputTokens: normalizedUsage.promptTokens,
        outputTokens: normalizedUsage.completionTokens,
      });
    },
  });
}

export function buildWorkflowOutputContractBlocks(
  _workflowRuntimeContext: WorkflowRuntimeContextForPrompt,
) {
  void _workflowRuntimeContext;
  return "";
}

export function normalizeLabel(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function resolveSyncMessageDirection(
  channel: Doc<"channels">,
  message: {
    from?: { id?: string; name?: string; username?: string };
  },
): boolean {
  const channelLabel = normalizeLabel(channel.displayUsername);
  const fromName = normalizeLabel(
    message.from?.name ?? message.from?.username,
  );
  const isOutgoingByName =
    channelLabel.length > 0 && fromName.length > 0 && fromName === channelLabel;

  const isOutgoingById =
    (channel.pageId !== undefined && message.from?.id === channel.pageId) ||
    (channel.igUserId !== undefined && message.from?.id === channel.igUserId);

  return isOutgoingByName || isOutgoingById;
}

export function businessAgentName(channel: Doc<"channels">): string {
  return channel.displayUsername?.trim() || "Support Team";
}

const contentTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("audio"),
  v.literal("file"),
  v.literal("video"),
  v.literal("document"),
  v.literal("unknown"),
);

const directionValidator = v.union(
  v.literal("incoming"),
  v.literal("outgoing"),
);

export const ingestChannelMessageArgs = {
  channelId: v.id("channels"),
  externalId: v.optional(v.string()),
  contactAddress: v.string(),
  contactName: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  direction: directionValidator,
  content: v.string(),
  contentType: v.optional(contentTypeValidator),
  messageKind: v.optional(messageKindValidator),
  broadcastPresentation: v.optional(broadcastPresentationValidator),
  workflowAutomationSource: v.optional(v.union(
    v.literal("workflowReminder"),
    v.literal("workflowFollowUp"),
  )),
  timestampMs: v.number(),
  isHistorical: v.optional(v.boolean()),
  outboundStatus: v.optional(
    v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
  ),
  assignedAgentId: v.optional(v.id("agents")),
  authorUserId: v.optional(v.string()),
  humanAgentName: v.optional(v.string()),
  metaConversationId: v.optional(v.string()),
  images: v.optional(
    v.array(
      v.object({
        url: v.string(),
        mimeType: v.string(),
      })
    )
  ),
  files: v.optional(
    v.array(
      v.object({
        url: v.string(),
        mimeType: v.string(),
      })
    )
  ),
};

export type IngestChannelMessageArgs = {
  channelId: Id<"channels">;
  externalId?: string;
  contactAddress: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  direction: "incoming" | "outgoing";
  content: string;
  contentType?: Doc<"messages">["contentType"];
  messageKind?: BroadcastMessageKind;
  broadcastPresentation?: BroadcastPresentation;
  workflowAutomationSource?: "workflowReminder" | "workflowFollowUp";
  timestampMs: number;
  isHistorical?: boolean;
  outboundStatus?: "sent" | "delivered" | "read" | "failed";
  assignedAgentId?: Id<"agents">;
  authorUserId?: string;
  humanAgentName?: string;
  metaConversationId?: string;
  images?: Array<{ url: string; mimeType: string }>;
  files?: Array<{ url: string; mimeType: string }>;
};

export type IngestChannelMessageResult = {
  conversationId: Id<"conversations">;
  messageIds: Id<"messages">[];
  skipped: boolean;
  shouldEnqueueAi: boolean;
  isNew?: boolean;
  agentMessageId?: string;
};

export async function ingestChannelMessage(
  ctx: MutationCtx,
  args: IngestChannelMessageArgs,
): Promise<IngestChannelMessageResult> {
  if (args.externalId) {
    const existingLedger = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existingLedger !== null) {
      return {
        conversationId: existingLedger.conversationId,
        messageIds: [],
        skipped: true,
        shouldEnqueueAi: false,
      };
    }
  }

  const channel = await ctx.db.get(args.channelId);
  if (channel === null) {
    throw new Error("Channel not found");
  }

  const service = channel.service;
  if (
    service !== "whatsapp" &&
    service !== "instagram" &&
    service !== "messenger" &&
    service !== "web"
  ) {
    throw new Error(`Unsupported channel service: ${service}`);
  }

  const customerId: Id<"customers"> = await ctx.runMutation(
    internal.customers.internalUpsertFromWebhook,
    {
      orgId: channel.orgId,
      service,
      contactAddress: args.contactAddress,
      profileName: args.contactName,
      email: args.contactEmail,
      phone: args.contactPhone,
      userId: channel.connectedByUserId,
      agentId: channel.defaultAgentId,
    },
  );

  const orgAddress =
    channel.phoneNumberId ?? channel.igUserId ?? channel.pageId ?? "web";

  const trimmedContent = args.content.trim();
  const images = args.images ?? [];
  const files = args.files ?? [];
  const preview =
    trimmedContent.length > 0
      ? trimmedContent.slice(0, 140)
      : images.length > 0
        ? "Image"
        : files.length > 0
          ? "Audio"
          : "";

  const {
    conversationId,
    threadId,
    isNew,
    assignedAgentId,
    assignToAiAgent,
  } = await upsertInboxConversation(ctx, {
    orgId: channel.orgId,
    channelId: channel._id,
    service,
    orgAddress,
    contactAddress: args.contactAddress,
    contactName: args.contactName,
    customerId,
    lastMessageAt: args.timestampMs,
    preview,
    isIncoming: args.direction === "incoming",
    assignedAgentId: args.assignedAgentId,
    metaConversationId: args.metaConversationId,
    isHistorical: args.isHistorical,
  });

  let agentMessageId: string | undefined;
  const hasThreadMessage =
    trimmedContent.length > 0 ||
    images.length > 0 ||
    files.length > 0 ||
    args.messageKind === "broadcast";
  if (hasThreadMessage) {
    if (args.direction === "incoming") {
      agentMessageId = await saveUserMessage(
        ctx,
        threadId,
        trimmedContent,
        args.timestampMs,
        images,
        files,
      );
    } else {
      agentMessageId = await saveHumanReply(ctx, threadId, trimmedContent, {
        assignedAgentId,
        authorUserId: args.authorUserId,
        sentAt: args.timestampMs,
        images: images.map(img => ({ url: img.url, mimeType: img.mimeType })),
        files: files.map(file => ({ url: file.url, mimeType: file.mimeType })),
        channelName: args.humanAgentName,
        messageMetadata: {
          ...broadcastAgentMetadata(args.messageKind, args.broadcastPresentation),
          ...(args.workflowAutomationSource
            ? { workflowAutomationSource: args.workflowAutomationSource }
            : {}),
        },
      });
    }
  }

  const now = args.timestampMs;
  const outboundStatus =
    args.direction === "outgoing" ? (args.outboundStatus ?? "sent") : undefined;
  const outboundStatusFields =
    outboundStatus === undefined
      ? {}
      : {
          status: outboundStatus,
          statusUpdatedAt: now,
          ...(outboundStatus === "read" ? { readAt: now } : {}),
        };
  const broadcastFields = {
    ...(args.messageKind ? { messageKind: args.messageKind } : {}),
    ...(args.broadcastPresentation
      ? { broadcastPresentation: args.broadcastPresentation }
      : {}),
    ...(args.workflowAutomationSource
      ? { workflowAutomationSource: args.workflowAutomationSource }
      : {}),
  };
  const messageIds: Id<"messages">[] = [];
  if (images.length > 0) {
    for (const img of images) {
      messageIds.push(await ctx.db.insert("messages", {
        orgId: channel.orgId,
        conversationId,
        channelId: channel._id,
        service,
        externalId: args.externalId,
        orgAddress,
        contactAddress: args.contactAddress,
        direction: args.direction,
        authorUserId: args.authorUserId,
        contentType: "image",
        content: img.url,
        mediaUrl: img.url,
        agentMessageId,
        ...broadcastFields,
        ...outboundStatusFields,
        createdAt: now,
      }));
    }
  }

  if (files.length > 0) {
    for (const file of files) {
      messageIds.push(await ctx.db.insert("messages", {
        orgId: channel.orgId,
        conversationId,
        channelId: channel._id,
        service,
        externalId: args.externalId,
        orgAddress,
        contactAddress: args.contactAddress,
        direction: args.direction,
        authorUserId: args.authorUserId,
        contentType: "file",
        content: file.url,
        mediaUrl: file.url,
        agentMessageId,
        ...broadcastFields,
        ...outboundStatusFields,
        createdAt: now,
      }));
    }
  }

  if (trimmedContent.length > 0 || (images.length === 0 && files.length === 0)) {
    messageIds.push(await ctx.db.insert("messages", {
      orgId: channel.orgId,
      conversationId,
      channelId: channel._id,
      service,
      externalId: args.externalId,
      orgAddress,
      contactAddress: args.contactAddress,
      direction: args.direction,
      authorUserId: args.authorUserId,
      contentType: args.contentType ?? "text",
      content: args.content,
      agentMessageId,
      ...broadcastFields,
      ...outboundStatusFields,
      createdAt: now,
    }));
  }

  await ctx.runMutation(internal.customers.internalSetLastConversation, {
    customerId,
    conversationId,
  });

  return {
    conversationId,
    messageIds,
    skipped: false,
    shouldEnqueueAi:
      !args.isHistorical &&
      args.direction === "incoming" &&
      assignToAiAgent &&
      assignedAgentId !== undefined &&
      Boolean(agentMessageId && (trimmedContent.length > 0 || images.length > 0 || files.length > 0)),
    isNew,
    agentMessageId,
  };
}

async function upsertInboxConversation(
  ctx: MutationCtx,
  args: {
    orgId: string;
    channelId: Id<"channels">;
    service: "whatsapp" | "instagram" | "messenger" | "web";
    orgAddress: string;
    contactAddress: string;
    contactName?: string;
    customerId: Id<"customers">;
    lastMessageAt: number;
    preview: string;
    isIncoming: boolean;
    assignedAgentId?: Id<"agents">;
    metaConversationId?: string;
    isHistorical?: boolean;
  },
): Promise<{
  conversationId: Id<"conversations">;
  threadId: string;
  isNew: boolean;
  assignedAgentId?: Id<"agents">;
  assignToAiAgent: boolean;
}> {
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_channel_and_contactAddress", (q) =>
      q
        .eq("channelId", args.channelId)
        .eq("contactAddress", args.contactAddress),
    )
    .unique();

  const now = Date.now();
  const channel = await ctx.db.get(args.channelId);
  const customer = await ctx.db.get(args.customerId);
  const resolvedContactName = args.contactName?.trim() || customer?.name?.trim();

  if (existing === null) {
    const threadId = await createThreadForConversation(ctx, {
      orgId: args.orgId,
      contactName: resolvedContactName,
      contactAddress: args.contactAddress,
      service: args.service,
    });

    let routingAgentId = channel?.defaultAgentId ?? args.assignedAgentId;
    if (routingAgentId === undefined) {
      const agents = await ctx.db
        .query("agents")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect();
      if (agents.length === 1) {
        routingAgentId = agents[0]!._id;
      } else if (agents.length > 1) {
        // Pick the most recently created agent so a conversation is always
        // assigned to an agent for segregation by (scope + agentId).
        routingAgentId = agents.reduce((latest, a) =>
          a.createdAt > latest.createdAt ? a : latest,
        )._id;
      }
    }
    if (routingAgentId === undefined && channel?.connectedByUserId) {
      // Final fallback for personal workspaces: resolve the owner's agent.
      const userAgent = await ctx.db
        .query("agents")
        .withIndex("by_userId", (q) => q.eq("userId", channel.connectedByUserId!))
        .order("desc")
        .first();
      if (userAgent !== null) {
        routingAgentId = userAgent._id;
      }
    }

    let assignToAiAgent = true;
    if (routingAgentId !== undefined) {
      const settings = await getOrCreateLeadAssignmentSettings(ctx, routingAgentId);
      assignToAiAgent = settings.aiEnabledOnInbound;
      if (settings.aiWhenOutsideSchedule && !(await isAnyoneOnSchedule(ctx, routingAgentId, now))) {
        assignToAiAgent = true;
      }
    }

    const conversationId = await ctx.db.insert("conversations", {
      orgId: args.orgId,
      userId: channel?.connectedByUserId,
      channelId: args.channelId,
      service: args.service,
      orgAddress: args.orgAddress,
      contactAddress: args.contactAddress,
      contactName: resolvedContactName,
      customerId: args.customerId,
      status: "open",
      tags: [],
      assignToAiAgent,
      assignedAgentId: routingAgentId,
      threadId,
      lastMessageAt: args.lastMessageAt,
      lastMessagePreview: args.preview && args.preview.trim() !== "" ? args.preview : undefined,
      lastCustomerMessageAt: args.isIncoming ? args.lastMessageAt : undefined,
      unreadCount: args.isHistorical ? 0 : (args.isIncoming ? 1 : 0),
      metaConversationId: args.metaConversationId,
      createdAt: now,
      updatedAt: now,
    });

    if (!args.isHistorical) {
      await logConversationEvent(ctx, {
        conversationId,
        action: "thread_created",
        metadata: {
          service: args.service,
        },
      });
    }

    if (routingAgentId !== undefined && channel !== null) {
      await applyInboundLeadRouting(ctx, {
        conversationId,
        orgId: args.orgId,
        agentId: routingAgentId,
        service: args.service,
        channelConnectedByUserId: channel.connectedByUserId,
      });
    } else if (channel !== null) {
      await ctx.db.patch(conversationId, {
        assignedUserId: channel.connectedByUserId,
        leadAssignmentFallback: true,
        updatedAt: now,
      });
    }

    return {
      conversationId,
      threadId,
      isNew: true,
      assignedAgentId: routingAgentId,
      assignToAiAgent,
    };
  }

  const patch: Record<string, unknown> = {
    lastMessageAt: args.lastMessageAt,
    unreadCount: args.isHistorical ? 0 : (args.isIncoming ? existing.unreadCount + 1 : existing.unreadCount),
    updatedAt: now,
  };
  if (args.preview && args.preview.trim() !== "") {
    patch.lastMessagePreview = args.preview;
  }
  if (args.isIncoming) {
    patch.lastCustomerMessageAt = args.lastMessageAt;
  }
  if (!existing.contactName && resolvedContactName) {
    patch.contactName = resolvedContactName;
  }
  if (!existing.customerId) {
    patch.customerId = args.customerId;
  }
  if (existing.status === "closed") patch.status = "open";
  if (!existing.assignedAgentId && args.assignedAgentId) {
    patch.assignedAgentId = args.assignedAgentId;
  }
  if (args.metaConversationId && !existing.metaConversationId) {
    patch.metaConversationId = args.metaConversationId;
  }
  await ctx.db.patch(existing._id, patch);

  return {
    conversationId: existing._id,
    threadId: existing.threadId,
    isNew: false,
    assignedAgentId: existing.assignedAgentId ?? args.assignedAgentId,
    assignToAiAgent: existing.assignToAiAgent,
  };
}
