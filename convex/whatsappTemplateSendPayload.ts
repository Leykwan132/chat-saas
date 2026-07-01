import { v } from "convex/values";
import { internalQuery, type ActionCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";
import { formatCalendarDateTime } from "./calendarFormatUtils";
import {
  assertWhatsAppTemplateMediaSpec,
  type WhatsAppTemplateHeaderFormat,
  type WhatsAppTemplateSendMediaType,
} from "../shared/whatsappTemplateMedia";
import {
  extractTemplateParameterKeys,
  findUnknownTemplateParameters,
} from "../shared/whatsappTemplateParameters";

type TemplateComponent = {
  type?: unknown;
  format?: unknown;
  text?: unknown;
};

type TemplateMediaParameter =
  | { type: "document"; document: { id: string } }
  | { type: "image"; image: { id: string } }
  | { type: "video"; video: { id: string } };

type TemplateTextParameter = {
  type: "text";
  parameter_name: string;
  text: string;
};

type TemplateSendComponent =
  | { type: "header"; parameters: [TemplateMediaParameter] }
  | { type: "body"; parameters: TemplateTextParameter[] };

type TemplateSendPayload = {
  name: string;
  language: { code: string };
  components?: TemplateSendComponent[];
};

function asComponentArray(value: unknown): TemplateComponent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (component): component is TemplateComponent =>
      component !== null &&
      typeof component === "object" &&
      !Array.isArray(component),
  );
}

function getBodyText(template: Doc<"whatsappTemplates"> | null) {
  if (template === null) return "";
  const body = asComponentArray(template.components).find(
    (component) => String(component.type ?? "").toUpperCase() === "BODY",
  );
  return typeof body?.text === "string" ? body.text : "";
}

function getHeaderFormat(template: Doc<"whatsappTemplates"> | null) {
  if (template === null) return null;
  const header = asComponentArray(template.components).find(
    (component) => String(component.type ?? "").toUpperCase() === "HEADER",
  );
  const format = String(header?.format ?? "").toUpperCase();
  if (format === "DOCUMENT" || format === "IMAGE" || format === "VIDEO") {
    return format as WhatsAppTemplateHeaderFormat;
  }
  return null;
}

function requireValue(values: Record<string, string>, key: string) {
  const value = values[key]?.trim();
  if (!value) {
    throw new Error(`Missing value for WhatsApp template parameter @${key}.`);
  }
  return value;
}

function mediaParameter(type: WhatsAppTemplateSendMediaType, id: string): TemplateMediaParameter {
  if (type === "document") return { type, document: { id } };
  if (type === "image") return { type, image: { id } };
  return { type, video: { id } };
}

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

export async function buildWhatsAppTemplateSendPayload(
  ctx: ActionCtx,
  args: {
    orgId: string;
    channelId: Id<"channels">;
    templateName: string;
    templateLanguage: string;
    customerId?: Id<"customers">;
    toPhone?: string;
  },
): Promise<TemplateSendPayload> {
  const queryArgs = {
    orgId: args.orgId,
    channelId: args.channelId,
    templateName: args.templateName,
    templateLanguage: args.templateLanguage,
    ...(args.customerId !== undefined ? { customerId: args.customerId } : {}),
    ...(args.toPhone !== undefined ? { toPhone: args.toPhone } : {}),
  };
  const context = await ctx.runQuery(
    internal.whatsappTemplateSendPayload.getTemplateSendPayloadContext,
    queryArgs,
  );
  const template = context.template;
  const payload: TemplateSendPayload = {
    name: args.templateName.trim(),
    language: { code: args.templateLanguage.trim() },
  };
  if (template === null) return payload;

  const components: TemplateSendComponent[] = [];
  const bodyText = getBodyText(template);
  const unknown = findUnknownTemplateParameters(bodyText);
  if (unknown.length > 0) {
    throw new Error(`Unknown WhatsApp template parameter: ${unknown.join(", ")}`);
  }
  const bodyKeys = extractTemplateParameterKeys(bodyText);
  if (bodyKeys.length > 0) {
    components.push({
      type: "body",
      parameters: bodyKeys.map((key) => ({
        type: "text",
        parameter_name: key,
        text: requireValue(context.parameterValues, key),
      })),
    });
  }

  const headerFormat = getHeaderFormat(template);
  if (headerFormat !== null) {
    const mediaAsset = context.mediaAsset;
    if (mediaAsset === null) {
      throw new Error("WhatsApp template media is still preparing.");
    }
    if (mediaAsset.status !== "ready" || !mediaAsset.mediaId?.trim()) {
      throw new Error(
        mediaAsset.lastError?.trim() ||
          "WhatsApp template media is still preparing.",
      );
    }
    const spec = assertWhatsAppTemplateMediaSpec(mediaAsset.mimeType);
    if (spec.headerFormat !== headerFormat) {
      throw new Error("Prepared WhatsApp template media format is invalid.");
    }
    components.unshift({
      type: "header",
      parameters: [mediaParameter(spec.sendType, mediaAsset.mediaId.trim())],
    });
  }

  if (components.length > 0) {
    payload.components = components;
  }
  return payload;
}
