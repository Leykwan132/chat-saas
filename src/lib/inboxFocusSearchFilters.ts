import {
  matchesInboxHandling,
  type InboxHandling,
  type InboxHandlingFilter,
} from "../../shared/inboxHandling";
import type { AssignmentFilter } from "@/components/inbox/InboxFilterSidebar";
import { matchesInboxLastReply } from "./inboxLastReplyFilter";

type Row = {
  conversationId: string;
  unreadCount: number;
  handling?: InboxHandling;
  assignedUserId?: string;
  service: string;
  isEscalated: boolean;
  hasBooking: boolean;
  lastReplyAuthor?: { kind: string } | null;
};
export type FocusInboxSearchFilters = {
  assignment: AssignmentFilter | "read";
  handling?: InboxHandlingFilter;
  currentUserId?: string;
  selectedConversationId: string | null;
  platforms: string[];
  escalated: boolean;
  booked: boolean;
  lastRepliedByAi?: boolean;
};

export function matchesFocusInboxSearchFilters(
  row: Row,
  filters: FocusInboxSearchFilters,
) {
  if (!matchesInboxLastReply(row, filters.lastRepliedByAi === true))
    return false;
  if (filters.handling && !matchesInboxHandling(row.handling, filters.handling))
    return false;
  if (filters.assignment === "read" && row.unreadCount > 0) return false;
  if (
    filters.assignment === "unread" &&
    row.unreadCount === 0 &&
    row.conversationId !== filters.selectedConversationId
  )
    return false;
  if (
    filters.assignment === "assigned_me" &&
    row.assignedUserId !== filters.currentUserId
  )
    return false;
  if (filters.assignment === "unassigned" && row.assignedUserId) return false;
  if (filters.platforms.length > 0 && !filters.platforms.includes(row.service))
    return false;
  return (
    (!filters.escalated || row.isEscalated) &&
    (!filters.booked || row.hasBooking)
  );
}
