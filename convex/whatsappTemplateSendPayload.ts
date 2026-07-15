import { v } from "convex/values";
import { internalQuery, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";
import { formatCalendarDateTime } from "./calendarFormatUtils";

export {
  buildWhatsAppTemplateSendPayload,
  buildWhatsAppTemplateSendPayloadWithContent,
} from "./whatsappTemplateSendPayloadBuild";

function setValue(values: Record<string, string>, key: string, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) values[key] = trimmed;
}

async function customerForPhone(
  ctx: QueryCtx,
  orgId: string,
  toPhone: string | undefined,
) {
  const phone = toPhone?.trim();
  if (!phone) return null;
  const rows = await ctx.db
    .query("customers")
    .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
      q.eq("orgId", orgId).eq("service", "whatsapp").eq("contactAddress", phone),
    )
    .take(1);
  return rows[0] ?? null;
}

export const getTemplateSendPayloadContext = internalQuery({
  args: {
    orgId: v.string(),
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    customerId: v.optional(v.id("customers")),
    toPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("whatsappTemplates")
      .withIndex("by_channelId_and_name_and_language", (q) =>
        q
          .eq("channelId", args.channelId)
          .eq("name", args.templateName.trim())
          .eq("language", args.templateLanguage.trim()),
      )
      .take(1);
    const localTemplate = template[0] ?? null;

    let mediaAsset: Doc<"whatsappTemplateMediaAssets"> | null = null;
    if (localTemplate !== null) {
      const mediaRows = await ctx.db
        .query("whatsappTemplateMediaAssets")
        .withIndex("by_templateId", (q) => q.eq("templateId", localTemplate._id))
        .take(1);
      mediaAsset = mediaRows[0] ?? null;
    }

    const customer =
      args.customerId !== undefined
        ? await ctx.db.get(args.customerId)
        : await customerForPhone(ctx, args.orgId, args.toPhone);
    const validCustomer =
      customer !== null && customer.orgId === args.orgId ? customer : null;
    const conversation =
      validCustomer?.lastConversationId !== undefined
        ? await ctx.db.get(validCustomer.lastConversationId)
        : null;
    const validConversation =
      conversation !== null && conversation.orgId === args.orgId
        ? conversation
        : null;

    const values: Record<string, string> = {};
    if (validCustomer !== null) {
      setValue(values, "customer_name", validCustomer.name ?? validConversation?.contactName);
      setValue(values, "customer_phone", validCustomer.phone ?? validCustomer.contactAddress);
    }

    if (validConversation !== null) {
      const sessions = await ctx.db
        .query("appointmentBookingSessions")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", validConversation._id))
        .take(100);
      const bookedSession = sessions
        .filter(
          (session) =>
            session.status === AppointmentBookingSessionStatus.Booked &&
            session.calendarEventId !== undefined &&
            session.serviceId !== undefined,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

      if (bookedSession !== undefined) {
        const event = await ctx.db.get(bookedSession.calendarEventId as Id<"calendarEvents">);
        const service = await ctx.db.get(bookedSession.serviceId as Id<"appointmentServices">);
        if (event !== null && service !== null && event.status !== "cancelled") {
          const formatted = formatCalendarDateTime(
            event.startAt,
            event.endAt,
            service.timeZone ?? event.timeZone,
          );
          setValue(values, "booking_date", formatted.date);
          setValue(values, "booking_time", formatted.timeRange);
          setValue(values, "booking_service", service.name);
          const participants = await ctx.db
            .query("calendarEventParticipants")
            .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
            .take(20);
          const assigned = participants.find((participant) => participant.role === "assigned");
          setValue(values, "assigned_team_member", assigned?.displayName ?? assigned?.email);
        }
      }
    }

    return { template: localTemplate, mediaAsset, parameterValues: values };
  },
});
