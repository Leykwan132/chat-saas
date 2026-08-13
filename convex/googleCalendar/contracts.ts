import { v } from "convex/values";

export const googleCalendarConnectionStateValidator = v.union(
  v.literal("connected"),
  v.literal("syncing"),
  v.literal("needs_reauthorization"),
  v.literal("disconnected"),
);

export type GoogleCalendarConnectionState =
  | "connected"
  | "syncing"
  | "needs_reauthorization"
  | "disconnected";

export const googleCalendarWatchChannelStateValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("retiring"),
  v.literal("retired"),
  v.literal("expired"),
);

export const googleCalendarSyncRunStateValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

export const googleCalendarSyncRequestKindValidator = v.union(
  v.literal("full"),
  v.literal("incremental"),
);

export const googleCalendarWriteActionValidator = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
);

export const googleCalendarWriteOperationStateValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("conflict"),
);

export const googleCalendarErrorKindValidator = v.union(
  v.literal("not_connected"),
  v.literal("needs_reauthorization"),
  v.literal("retryable"),
  v.literal("conflict"),
  v.literal("not_found"),
  v.literal("forbidden"),
  v.literal("invalid_request"),
  v.literal("failed"),
);

export const googleCalendarExternalOriginValidator = v.union(
  v.literal("google"),
  v.literal("kilobot"),
);

export const googleCalendarExternalStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("tentative"),
  v.literal("cancelled"),
);

export const googleCalendarExternalTransparencyValidator = v.union(
  v.literal("opaque"),
  v.literal("transparent"),
);

export const googleCalendarExternalSyncStateValidator = v.union(
  v.literal("synced"),
  v.literal("pending"),
  v.literal("failed"),
  v.literal("conflict"),
);

export const googleCalendarOperationResultValidator = v.union(
  v.object({
    kind: v.literal("success"),
    externalEventId: v.string(),
  }),
  v.object({
    kind: googleCalendarErrorKindValidator,
    message: v.string(),
  }),
);

export type GoogleCalendarOperationFailure = {
  kind:
    | "not_connected"
    | "needs_reauthorization"
    | "retryable"
    | "conflict"
    | "not_found"
    | "forbidden"
    | "invalid_request"
    | "failed";
  message: string;
};

export type GoogleCalendarOperationResult =
  | { kind: "success"; externalEventId: string }
  | GoogleCalendarOperationFailure;

const googleCalendarOperationMessages: Record<
  Exclude<GoogleCalendarOperationResult["kind"], "success">,
  string
> = {
  not_connected: "Google Calendar is not connected.",
  needs_reauthorization: "Google Calendar needs to be reconnected.",
  retryable: "Google Calendar is temporarily unavailable.",
  conflict: "Google Calendar changed before this update could be applied.",
  not_found: "Google Calendar could not find the requested event.",
  forbidden: "Google Calendar denied this request.",
  invalid_request: "Google Calendar could not process this request.",
  failed: "Google Calendar request failed.",
};

export function googleCalendarOperationError(
  kind: GoogleCalendarOperationFailure["kind"],
): GoogleCalendarOperationFailure {
  return { kind, message: googleCalendarOperationMessages[kind] };
}
