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
test("Read and Unread apply to search results as well as chat lists", () => {
  expect(
    matchesFocusInboxSearchFilters(row, { ...filters, assignment: "read" }),
  ).toBe(true);
  expect(
    matchesFocusInboxSearchFilters(row, { ...filters, assignment: "unread" }),
  ).toBe(false);
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, unreadCount: 2 },
      { ...filters, assignment: "read" },
    ),
  ).toBe(false);
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, unreadCount: 2 },
      { ...filters, assignment: "unread" },
    ),
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

test("handling filters combine with read state and status in search", () => {
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, handling: "ai" },
      { ...filters, assignment: "read", handling: "ai" },
    ),
  ).toBe(true);
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, handling: "human" },
      { ...filters, handling: "ai" },
    ),
  ).toBe(false);
  expect(
    matchesFocusInboxSearchFilters(
      { ...row, handling: "attention", isEscalated: true },
      { ...filters, handling: "human", escalated: true },
    ),
  ).toBe(true);
});
