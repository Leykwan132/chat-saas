import { expect, test } from "vitest";
import type { Doc, Id } from "./_generated/dataModel";
import { countAbandonedConversations } from "./agentOverviewAbandonments";

const now = 1_700_000_000_000;
const staleCustomerMessageAt = now - 25 * 60 * 60 * 1000;

function conversation(
  id: string,
  overrides: Partial<Doc<"conversations">> = {},
): Doc<"conversations"> {
  return {
    _id: id as Id<"conversations">,
    _creationTime: now,
    orgId: "",
    userId: "overview-owner",
    service: "whatsapp",
    orgAddress: "business",
    contactAddress: id,
    status: "open",
    assignedAgentId: "agent" as Id<"agents">,
    assignToAiAgent: true,
    threadId: `thread-${id}`,
    lastMessageAt: staleCustomerMessageAt,
    lastCustomerMessageAt: staleCustomerMessageAt,
    unreadCount: 0,
    createdAt: staleCustomerMessageAt,
    updatedAt: staleCustomerMessageAt,
    ...overrides,
  };
}

function booking(conversationId: Id<"conversations">): Doc<"calendarEvents"> {
  return {
    _id: "booking" as Id<"calendarEvents">,
    _creationTime: now,
    teamId: "team" as Id<"teams">,
    title: "Consultation",
    startAt: now,
    endAt: now + 3_600_000,
    timeZone: "UTC",
    status: "confirmed",
    createdBy: "user" as Id<"users">,
    conversationId,
    bookingSource: "ai",
    createdAt: now,
    updatedAt: now,
  };
}

test("counts only stale customer-last open conversations as abandoned", () => {
  const abandoned = conversation("abandoned");
  const answered = conversation("answered", {
    lastMessageAt: staleCustomerMessageAt + 1_000,
  });
  const recent = conversation("recent", {
    lastMessageAt: now,
    lastCustomerMessageAt: now,
  });
  const escalated = conversation("escalated", { status: "requires_user_input" });
  const booked = conversation("booked");

  expect(
    countAbandonedConversations(
      [abandoned, answered, recent, escalated, booked],
      [booking(booked._id)],
      now,
    ),
  ).toBe(1);
});
