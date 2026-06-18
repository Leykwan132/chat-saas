import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertValidEmailFormat } from "../shared/emailValidation";

const contactIntentValidator = v.union(
  v.literal("enterprise"),
  v.literal("support"),
  v.literal("demo"),
);

function requireTrimmed(value: string | undefined, label: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

export const submit = mutation({
  args: {
    intent: contactIntentValidator,
    email: v.string(),
    supportDescription: v.optional(v.string()),
    companyName: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
    contactName: v.optional(v.string()),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    numberOfUsers: v.optional(v.string()),
    additionalDetails: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = assertValidEmailFormat(args.email);
    const now = Date.now();
    const additionalDetails = args.additionalDetails?.trim() || undefined;

    let requestId;

    if (args.intent === "support") {
      requestId = await ctx.db.insert("contactRequests", {
        intent: args.intent,
        email,
        status: "unread",
        supportDescription: additionalDetails,
        additionalDetails,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const companyName = requireTrimmed(args.companyName, "Company");
      const contactName = requireTrimmed(args.contactName, "Contact name");
      const contactNumber = requireTrimmed(args.contactNumber, "Phone number");
      const numberOfUsers = requireTrimmed(args.numberOfUsers, "Company size");

      if (args.intent === "demo") {
        requestId = await ctx.db.insert("contactRequests", {
          intent: args.intent,
          email,
          status: "unread",
          companyName,
          contactName,
          contactNumber,
          numberOfUsers,
          additionalDetails,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        requestId = await ctx.db.insert("contactRequests", {
          intent: args.intent,
          email,
          status: "unread",
          companyName,
          contactName,
          contactNumber,
          company: companyName,
          numberOfUsers,
          additionalDetails,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.scheduler.runAfter(0, internal.contactAdminNotify.sendNewRequestAlert, {
      requestId,
    });

    return requestId;
  },
});
