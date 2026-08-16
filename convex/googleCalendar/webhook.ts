import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { hashGoogleCalendarChannelToken } from "./channelToken";

type ResourceState = "sync" | "exists" | "not_exists";
type Notification = {
  channelId: string;
  token: string;
  resourceId: string;
  resourceState: ResourceState;
  messageNumber: number;
  headerExpirationAt: number;
};

type Acceptance = { kind: "accepted" | "duplicate" | "rejected" };

const acceptNotification = (internal as unknown as {
  googleCalendar: {
    watchStore: {
      acceptNotification: FunctionReference<
        "mutation",
        "internal",
        {
          channelId: string;
          tokenHash: string;
          resourceId: string;
          resourceState: ResourceState;
          messageNumber: number;
          headerExpirationAt: number;
          now: number;
        },
        Acceptance
      >;
    };
  };
}).googleCalendar.watchStore.acceptNotification;

function parseNotification(request: Request): Notification | undefined {
  const channelId = request.headers.get("X-Goog-Channel-ID") ?? "";
  const token = request.headers.get("X-Goog-Channel-Token") ?? "";
  const resourceId = request.headers.get("X-Goog-Resource-ID") ?? "";
  const resourceState = request.headers.get("X-Goog-Resource-State") ?? "";
  const messageNumberRaw = request.headers.get("X-Goog-Message-Number") ?? "";
  const expirationRaw = request.headers.get("X-Goog-Channel-Expiration") ?? "";
  const messageNumber = Number(messageNumberRaw);
  const headerExpirationAt = Date.parse(expirationRaw);
  if (
    channelId.length === 0 || !/^[A-Za-z0-9_-]{43}$/.test(token) || resourceId.length === 0 ||
    !/^[1-9]\d*$/.test(messageNumberRaw) || !Number.isSafeInteger(messageNumber) ||
    !Number.isFinite(headerExpirationAt) ||
    (resourceState !== "sync" && resourceState !== "exists" && resourceState !== "not_exists")
  ) {
    return undefined;
  }
  return {
    channelId,
    token,
    resourceId,
    resourceState,
    messageNumber,
    headerExpirationAt,
  };
}

export const googleCalendarWebhook = httpAction(async (ctx, request) => {
  const notification = parseNotification(request);
  if (notification === undefined) return new Response(null, { status: 404 });
  const tokenHash = await hashGoogleCalendarChannelToken(notification.token);
  const result: Acceptance = await ctx.runMutation(acceptNotification, {
    channelId: notification.channelId,
    tokenHash,
    resourceId: notification.resourceId,
    resourceState: notification.resourceState,
    messageNumber: notification.messageNumber,
    headerExpirationAt: notification.headerExpirationAt,
    now: Date.now(),
  });
  return new Response(null, { status: result.kind === "rejected" ? 404 : 204 });
});
