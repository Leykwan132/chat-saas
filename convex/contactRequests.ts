import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
    const email = requireTrimmed(args.email, "Email");
    const now = Date.now();
    const additionalDetails = args.additionalDetails?.trim() || undefined;

    if (args.intent === "support") {
      return await ctx.db.insert("contactRequests", {
        intent: args.intent,
        email,
        status: "new",
        supportDescription: additionalDetails,
        additionalDetails,
        createdAt: now,
        updatedAt: now,
      });
    }

    const companyName = requireTrimmed(args.companyName, "Company");
    const contactName = requireTrimmed(args.contactName, "Contact name");
    const contactNumber = requireTrimmed(args.contactNumber, "Phone number");

    if (args.intent === "demo") {
      return await ctx.db.insert("contactRequests", {
        intent: args.intent,
        email,
        status: "new",
        companyName,
        contactName,
        contactNumber,
        numberOfUsers: args.numberOfUsers?.trim() || undefined,
        additionalDetails,
        createdAt: now,
        updatedAt: now,
      });
    }

    const numberOfUsers = requireTrimmed(args.numberOfUsers, "Company size");

    return await ctx.db.insert("contactRequests", {
      intent: args.intent,
      email,
      status: "new",
      companyName,
      contactName,
      contactNumber,
      company: companyName,
      numberOfUsers,
      additionalDetails,
      createdAt: now,
      updatedAt: now,
    });
  },
});
