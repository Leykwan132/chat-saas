import { expect, test } from "vitest";
import {
  matchesFocusInboxSearchFilters,
  type FocusInboxSearchFilters,
} from "./inboxFocusSearchFilters";
const row = {
  conversationId: "chat",
  unreadCount: 0,
  assignedUserId: "teammate",
  service: "web",
  isEscalated: false,
  hasBooking: false,
};
const filters: FocusInboxSearchFilters = {
  assignment: "all",
  currentUserId: "teammate",
  selectedConversationId: null,
  platforms: [],
  escalated: false,
  booked: false,
};
test("last replied by AI filters search using the outgoing reply author", () => {
  const selected = { ...filters, lastRepliedByAi: true };
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, lastReplyAuthor: { kind: "ai" } },
      selected,
    ),
  ).toBe(true);
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, lastReplyAuthor: { kind: "human" } },
      selected,
    ),
  ).toBe(false);
  expect(matchesFocusInboxSearchFilters(row, selected)).toBe(false);
});
test("Unread applies to search results and preserves the selected conversation", () => {
  expect(
    matchesFocusInboxSearchFilters(row, { ...filters, assignment: "unread" }),
  ).toBe(false);
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, unreadCount: 2 },
      { ...filters, assignment: "unread" },
    ),
  ).toBe(true);
  expect(
    matchesFocusInboxSearchFilters(row, {
      ...filters,
      assignment: "unread",
      selectedConversationId: "chat",
    }),
  ).toBe(true);
});
test("combines assignment, platform and status filters", () => {
  expect(
    matchesFocusInboxSearchFilters(row, {
      ...filters,
      assignment: "assigned_me",
    }),
  ).toBe(true);
  expect(
    matchesFocusInboxSearchFilters(row, {
      ...filters,
      assignment: "unassigned",
    }),
  ).toBe(false);
  expect(
    matchesFocusInboxSearchFilters(row, {
      ...filters,
      platforms: ["whatsapp"],
    }),
  ).toBe(false);
  expect(
    matchesFocusInboxSearchFilters(row, { ...filters, escalated: true }),
  ).toBe(false);
  expect(
    matchesFocusInboxSearchFilters(row, { ...filters, booked: true }),
  ).toBe(false);
});
