import type { Doc } from "./_generated/dataModel";
import { messageSearchScopeChanged } from "./inboxSearchProjection";

export function customerInboxFieldsChanged(
  previous: Doc<"customers"> | null,
  current: Doc<"customers"> | null,
) {
  if (previous === null || current === null) return true;
  return (
    previous.name !== current.name ||
    previous.email !== current.email ||
    previous.phone !== current.phone ||
    previous.contactAddress !== current.contactAddress ||
    previous.leadTemperature !== current.leadTemperature ||
    JSON.stringify(previous.tags) !== JSON.stringify(current.tags)
  );
}

export function customerSearchDetailsChanged(
  previous: Doc<"customers"> | null,
  current: Doc<"customers"> | null,
) {
  if (previous === null || current === null) return true;
  return (
    previous.email !== current.email ||
    previous.phone !== current.phone ||
    previous.contactAddress !== current.contactAddress
  );
}

export function summaryChatSearchFieldsChanged(
  previous: Doc<"inboxConversationSummaries"> | null,
  current: Doc<"inboxConversationSummaries"> | null,
) {
  return (
    messageSearchScopeChanged(previous, current) ||
    previous?.customerId !== current?.customerId ||
    previous?.contactName !== current?.contactName
  );
}

export function messageSearchFieldsChanged(
  previous: Doc<"messages"> | null,
  current: Doc<"messages"> | null,
) {
  if (previous === null || current === null) return true;
  return (
    previous.content !== current.content ||
    previous.contentType !== current.contentType ||
    previous.conversationId !== current.conversationId ||
    previous.createdAt !== current.createdAt
  );
}
