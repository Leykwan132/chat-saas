import { v } from "convex/values";

export const contactIntentValidator = v.union(
  v.literal("enterprise"),
  v.literal("support"),
  v.literal("demo"),
  v.literal("early_user"),
);

export const contactStatusValidator = v.union(
  v.literal("unread"),
  v.literal("seen"),
  v.literal("replied"),
  v.literal("closed"),
);

export type ContactStatus =
  | "unread"
  | "seen"
  | "replied"
  | "closed";

export type ContactIntent = "enterprise" | "support" | "demo" | "early_user";

export const CONTACT_STATUSES: ContactStatus[] = [
  "unread",
  "seen",
  "replied",
  "closed",
];

export function normalizeContactStatus(
  status: string,
): ContactStatus {
  switch (status) {
    case "new":
      return "unread";
    case "reviewed":
      return "seen";
    case "unread":
    case "seen":
    case "replied":
    case "closed":
      return status;
    default:
      return "unread";
  }
}

export function formatContactIntent(intent: ContactIntent): string {
  switch (intent) {
    case "enterprise":
      return "Enterprise plan";
    case "support":
      return "Support";
    case "demo":
      return "Book a demo";
    case "early_user":
      return "Early user program";
  }
}
