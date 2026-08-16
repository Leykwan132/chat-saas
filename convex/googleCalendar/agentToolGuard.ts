import type { Doc, Id } from "../_generated/dataModel";

export type AgentCalendarBusyInterval = {
  startAt: number;
  endAt: number;
  busy: true;
};

export type AgentCalendarToolFailure = {
  kind:
    | "not_connected"
    | "needs_reauthorization"
    | "retryable"
    | "conflict"
    | "not_found"
    | "forbidden"
    | "invalid_request"
    | "failed";
  success: false;
  message: string;
};

export type AgentCalendarMutationOk = {
  kind: "ok";
  event: Doc<"calendarEvents">;
};

const failureMessages: Record<AgentCalendarToolFailure["kind"], string> = {
  not_connected: "Google Calendar is not connected.",
  needs_reauthorization: "Google Calendar needs to be reconnected.",
  retryable: "Google Calendar is temporarily unavailable.",
  conflict: "The calendar changed before this update could be applied.",
  not_found: "That calendar event was not found.",
  forbidden: "This event cannot be changed from this conversation.",
  invalid_request: "This calendar request is not allowed.",
  failed: "The calendar request failed.",
};

export function agentCalendarToolFailure(
  kind: AgentCalendarToolFailure["kind"],
  message?: string,
): AgentCalendarToolFailure {
  return { kind, success: false, message: message ?? failureMessages[kind] };
}

export function requireExplicitConfirmation(confirmed: boolean) {
  if (confirmed === true) return null;
  return agentCalendarToolFailure(
    "invalid_request",
    "Cancellation and updates require an explicit current customer confirmation.",
  );
}

export function guardKilobotConversationEvent(
  event: Doc<"calendarEvents"> | null,
  conversationId: Id<"conversations">,
): AgentCalendarToolFailure | AgentCalendarMutationOk {
  if (event === null) return agentCalendarToolFailure("not_found");
  const origin = event.externalOrigin ?? "kilobot";
  if (origin !== "kilobot" || event.conversationId !== conversationId) {
    return agentCalendarToolFailure("forbidden");
  }
  return { kind: "ok", event };
}
