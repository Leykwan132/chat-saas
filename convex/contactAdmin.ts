import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { assertAdminSession } from "./contactAdminAuth";
import {
  contactIntentValidator,
  contactStatusValidator,
  CONTACT_STATUSES,
  formatContactIntent,
  normalizeContactStatus,
  type ContactIntent,
  type ContactStatus,
} from "./contactAdminShared";
import type { Doc, Id } from "./_generated/dataModel";

function serializeContactRequest(request: Doc<"contactRequests">) {
  return {
    _id: request._id,
    intent: request.intent,
    email: request.email,
    status: normalizeContactStatus(request.status),
    supportDescription: request.supportDescription,
    companyName: request.companyName,
    contactNumber: request.contactNumber,
    contactName: request.contactName,
    company: request.company,
    industry: request.industry,
    numberOfUsers: request.numberOfUsers,
    additionalDetails: request.additionalDetails,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function compareRequestsNewestFirst(
  a: Doc<"contactRequests">,
  b: Doc<"contactRequests">,
) {
  return b.createdAt - a.createdAt;
}

export const listContactRequests = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(contactStatusValidator),
    intent: v.optional(contactIntentValidator),
  },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);

    let requests = await ctx.db
      .query("contactRequests")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    if (args.status) {
      requests = requests.filter(
        (request) => normalizeContactStatus(request.status) === args.status,
      );
    }

    if (args.intent) {
      requests = requests.filter((request) => request.intent === args.intent);
    }

    return requests.sort(compareRequestsNewestFirst).map(serializeContactRequest);
  },
});

export const getContactRequest = query({
  args: {
    sessionToken: v.string(),
    requestId: v.id("contactRequests"),
  },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Contact request not found");
    }

    return serializeContactRequest(request);
  },
});

export const getContactRequestCounts = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);

    const requests = await ctx.db.query("contactRequests").collect();
    const counts: Record<ContactStatus, number> = {
      unread: 0,
      seen: 0,
      replied: 0,
      closed: 0,
    };

    for (const request of requests) {
      const status = normalizeContactStatus(request.status);
      counts[status] += 1;
    }

    return {
      total: requests.length,
      counts,
    };
  },
});

export const updateContactRequestStatus = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("contactRequests"),
    status: contactStatusValidator,
  },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Contact request not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: args.status,
      updatedAt: now,
    });

    return {
      requestId: args.requestId,
      status: args.status,
      updatedAt: now,
    };
  },
});

export const getRequestForNotify = internalQuery({
  args: {
    requestId: v.id("contactRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    return serializeContactRequest(request);
  },
});

export function buildContactRequestSummary(request: {
  _id: Id<"contactRequests">;
  intent: ContactIntent;
  email: string;
  status: ContactStatus;
  supportDescription?: string;
  companyName?: string;
  contactNumber?: string;
  contactName?: string;
  company?: string;
  numberOfUsers?: string;
  additionalDetails?: string;
  createdAt: number;
}) {
  const lines: string[] = [
    `Intent: ${formatContactIntent(request.intent)}`,
    `Email: ${request.email}`,
  ];

  if (request.contactName) {
    lines.push(`Contact: ${request.contactName}`);
  }
  if (request.companyName || request.company) {
    lines.push(`Company: ${request.companyName ?? request.company}`);
  }
  if (request.contactNumber) {
    lines.push(`Phone: ${request.contactNumber}`);
  }
  if (request.numberOfUsers) {
    lines.push(`Company size: ${request.numberOfUsers}`);
  }
  if (request.supportDescription) {
    lines.push(`Support details: ${request.supportDescription}`);
  }
  if (request.additionalDetails) {
    lines.push(`Additional details: ${request.additionalDetails}`);
  }

  return {
    intentLabel: formatContactIntent(request.intent),
    lines,
    status: request.status,
    createdAt: request.createdAt,
    requestId: request._id,
  };
}

export { CONTACT_STATUSES };
